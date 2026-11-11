import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"
import { getVideoGenerationContext } from "@/lib/video-generation-payload"
import { DEFAULT_VIDEO_MODEL, isVideoModelId } from "@/lib/pricing-plans"
import { getVideoModelConfig } from "@/lib/video-models"
import { videoReservationKey } from "@/lib/video-credits"

const ALLOWED_ANGLES = [
  "comparison", "problem-solution", "primary-benefit", "social-proof",
  "product-demo", "usage-experience", "offer-convenience", "unique-mechanism",
]

const ALLOWED_STYLES = [
  "white-bg", "lifestyle", "product-action", "b2b",
  "premium-editorial", "benefits-infographic", "direct-offer", "minimal-tech",
]

const MAX_HOOK_CHARS = 2000
const VIDEO_RATE_LIMIT_MAX = 3
const VIDEO_RATE_LIMIT_WINDOW_MS = 60_000
// El RPC compartido exige un límite diario; este valor evita añadir una regla diaria nueva.
const VIDEO_RATE_LIMIT_DAILY_MAX = 2_147_483_647

const N8N_VIDEO_TIMEOUT_MS = 360_000
const VIDEO_REFERENCE_BUCKETS = new Set(["referencias", "creativos"])

const headersNoStore = { "Cache-Control": "no-store" }

function getSupabaseStorageOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" ? parsed.origin : null
  } catch {
    return null
  }
}

function getOwnedReferencePath(url: string, userId: string): { bucket: string; storagePath: string } | null {
  if (!url || url.length > 2048) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return null
  const storageOrigin = getSupabaseStorageOrigin()
  if (!storageOrigin || parsed.origin !== storageOrigin) return null

  let segments: string[]
  try {
    segments = parsed.pathname.split("/").slice(1).map((segment) => decodeURIComponent(segment))
  } catch {
    return null
  }
  if (segments.length < 7 || segments[0] !== "storage" || segments[1] !== "v1" || segments[2] !== "object" || segments[3] !== "public") return null

  const bucket = segments[4]
  const storagePath = segments.slice(5).join("/")
  const ownerId = segments[5]
  const objectSegments = segments.slice(6)
  if (!VIDEO_REFERENCE_BUCKETS.has(bucket) || ownerId !== userId) return null
  if (objectSegments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("%"))) return null

  return { bucket, storagePath }
}

const ANGLE_MOTION_MAP: Record<string, string> = {
  "comparison": "contrast between alternatives, split visual tension",
  "problem-solution": "problem to solution transition, emotional shift",
  "primary-benefit": "highlight the main benefit clearly, aspirational reveal",
  "social-proof": "authentic testimonial feel, trustworthy atmosphere",
  "product-demo": "product in action, demonstrating functionality",
  "usage-experience": "product naturally integrated into daily routine",
  "offer-convenience": "offer reveal, value emphasis, purchase-ready mood",
  "unique-mechanism": "technical mechanism explanation, scientific feel",
}

const STYLE_MOOD_MAP: Record<string, string> = {
  "white-bg": "clean studio lighting, minimal background",
  "lifestyle": "lifestyle context, natural environment",
  "product-action": "product actively being used, dynamic scene",
  "b2b": "professional corporate atmosphere, business setting",
  "premium-editorial": "premium editorial aesthetic, sophisticated lighting",
  "benefits-infographic": "clean infographic style, organized data",
  "direct-offer": "commercial direct response look, bold and clear",
  "minimal-tech": "minimalist technology aesthetic, modern and precise",
}

function buildVideoPrompt(angle: string, hook: string, style: string): string {
  const parts: string[] = []

  const hookTrimmed = hook.trim()
  if (hookTrimmed) parts.push(hookTrimmed)

  const angleDesc = ANGLE_MOTION_MAP[angle]
  if (angleDesc) parts.push(angleDesc)

  const styleDesc = STYLE_MOOD_MAP[style]
  if (styleDesc) parts.push(styleDesc)

  parts.push(
    "Preserve the original composition, product identity, text, logo and proportions. " +
    "Natural coherent motion, realistic physics, gentle camera movement, premium advertising look."
  )

  return parts.join(". ")
}

type ReserveResult = { ok: true; balance: number } | { ok: false; status: 402 | 503 }

const isBalance = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0

const rpcResult = (data: unknown): Record<string, unknown> | null =>
  typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null

/*
 * Charges one video START to the credit engine v2. The key comes from the
 * request's idempotency key (video:<uuid>), which video_start_requests lets
 * through once per user, so STATUS can later refund exactly this reservation
 * when fal reports a definitive failure.
 */
async function reserveVideoCredits(userId: string, reservationKey: string, credits: number): Promise<ReserveResult> {
  try {
    const { data, error } = await createAdminClient().rpc("reserve_credits_v2", {
      p_user_id: userId,
      p_reservation_key: reservationKey,
      p_credits: credits,
    })
    if (error?.message === "insufficient_credits") return { ok: false, status: 402 }
    if (error) {
      console.error("Video START reserve_credits_v2 failed:", error.message)
    } else {
      const result = rpcResult(data)
      if (result?.status === "reserved" && isBalance(result.balance)) return { ok: true, balance: result.balance }
      console.error("Video START reserve_credits_v2 unexpected result:", result?.status ?? typeof data)
    }
  } catch (error) {
    console.error("Video START reserve_credits_v2 exception:", error instanceof Error ? error.message : "unknown")
  }
  // A lost connection can hide a charge that did go through: release this key.
  await refundVideoCredits(userId, reservationKey, "release")
  return { ok: false, status: 503 }
}

/**
 * Refunds exactly this reservation; returns false if it failed.
 * "release" is the emergency path after an unconfirmed reservation: an absent
 * reservation is expected there, any other failure is logged with key and user.
 */
async function refundVideoCredits(
  userId: string,
  reservationKey: string,
  mode: "refund" | "release" = "refund",
): Promise<boolean> {
  const fail = (reason: string) => {
    const label = mode === "release" ? "Video START emergency credit release failed:" : "Video START refund_credits_v2 failed:"
    console.error(label, reason, "key:", reservationKey, "user:", userId)
    return false
  }
  try {
    const { data, error } = await createAdminClient().rpc("refund_credits_v2", {
      p_user_id: userId,
      p_reservation_key: reservationKey,
    })
    if (error) {
      if (mode === "release" && error.message === "reservation_not_found") return false
      return fail(error.message)
    }
    const result = rpcResult(data)
    if ((result?.status === "refunded" || result?.status === "already_refunded") && isBalance(result.balance)) return true
    return fail(`unexpected result: ${result?.status ?? typeof data}`)
  } catch (error) {
    return fail(`exception: ${error instanceof Error ? error.message : "unknown"}`)
  }
}

async function markVideoStartFailed(userId: string, idempotencyKey: string): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("video_start_requests")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "processing")
    if (error) console.error("Video START idempotency failure update failed:", error.code)
  } catch {
    console.error("Video START idempotency failure update exception")
  }
}

async function markVideoStartStarted(
  userId: string,
  idempotencyKey: string,
  tracking: { requestId: string; statusUrl: string; responseUrl: string },
  remainingCredits: number,
): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("video_start_requests")
      .update({
        status: "started",
        request_id: tracking.requestId,
        status_url: tracking.statusUrl,
        response_url: tracking.responseUrl,
        remaining_credits: remainingCredits,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "processing")
    // START ya creó el job: un fallo al guardar el resultado jamás debe provocar otro Submit ni un refund.
    if (error) console.error("Video START idempotency result update failed:", error.code)
  } catch {
    console.error("Video START idempotency result update exception")
  }
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: headersNoStore })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: headersNoStore })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401, headers: headersNoStore })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().toLowerCase() : ""
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return NextResponse.json({ success: false, error: "Clave de solicitud inválida" }, { status: 400, headers: headersNoStore })
  }

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : ""
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl es obligatorio" }, { status: 400, headers: headersNoStore })
  }
  if (!getOwnedReferencePath(imageUrl, user.id)) {
    return NextResponse.json({ error: "URL de imagen no permitida" }, { status: 400, headers: headersNoStore })
  }

  const angle = typeof body.angle === "string" ? body.angle : ""
  if (!ALLOWED_ANGLES.includes(angle)) {
    return NextResponse.json({ error: "Ángulo no válido" }, { status: 400, headers: headersNoStore })
  }

  const style = typeof body.style === "string" ? body.style : ""
  if (!ALLOWED_STYLES.includes(style)) {
    return NextResponse.json({ error: "Estilo no válido" }, { status: 400, headers: headersNoStore })
  }

  const hook = typeof body.hook === "string" ? body.hook.trim().slice(0, MAX_HOOK_CHARS) : ""

  // The tier decides model, duration and price on the server; older clients that send none get Video Rápido.
  const tier = body.model === undefined ? DEFAULT_VIDEO_MODEL : body.model
  if (!isVideoModelId(tier)) {
    return NextResponse.json({ error: "Modelo de video no válido" }, { status: 400, headers: headersNoStore })
  }
  const videoModel = getVideoModelConfig(tier)

  const prompt = buildVideoPrompt(angle, hook, style)
  // The client's duration is never forwarded: every tier generates its fixed length.
  const { duration: _clientDuration, ...context } = getVideoGenerationContext(body)
  void _clientDuration

  const n8nVideoUrl = process.env.N8N_VIDEO_WEBHOOK_URL
  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!n8nVideoUrl || !internalSecret) {
    return NextResponse.json({ error: "Servicio de video no configurado" }, { status: 500, headers: headersNoStore })
  }

  const modelPayload = { model: tier, falModel: videoModel.falModel, duration: videoModel.duration, resolution: videoModel.resolution }
  const startPayload = { imageUrl, prompt, angle, hook, style, ...context, ...modelPayload }
  const payloadHash = createHash("sha256").update(JSON.stringify({ imageUrl, angle, hook, style, ...context, model: tier })).digest("hex")
  const adminClient = createAdminClient()
  const { error: claimError } = await adminClient.from("video_start_requests").insert({
    user_id: user.id,
    idempotency_key: idempotencyKey,
    payload_hash: payloadHash,
    status: "processing",
  })

  if (claimError) {
    if (claimError.code !== "23505") {
      return NextResponse.json({ success: false, error: "No se pudo verificar esta solicitud" }, { status: 503, headers: headersNoStore })
    }

    const { data: existing, error: readError } = await adminClient
      .from("video_start_requests")
      .select("payload_hash,status,request_id,status_url,response_url,remaining_credits")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle()

    if (readError || !existing) {
      return NextResponse.json({ success: false, error: "No se pudo consultar esta solicitud" }, { status: 503, headers: headersNoStore })
    }
    if (existing.payload_hash !== payloadHash) {
      return NextResponse.json({ success: false, error: "La clave ya se utilizó para otra solicitud" }, { status: 409, headers: headersNoStore })
    }
    if (existing.status === "started" && existing.request_id && existing.status_url && existing.response_url) {
      return NextResponse.json({
        success: true,
        status: "processing",
        requestId: existing.request_id,
        statusUrl: existing.status_url,
        responseUrl: existing.response_url,
        remainingCredits: existing.remaining_credits,
        deduplicated: true,
      }, { status: 200, headers: headersNoStore })
    }
    if (existing.status === "failed") {
      return NextResponse.json({ success: false, status: "failed", error: "Esta solicitud ya falló. Inicia una nueva generación." }, { status: 409, headers: headersNoStore })
    }
    return NextResponse.json({ success: false, status: "processing", deduplicated: true, error: "Esta solicitud ya se está iniciando. Intenta consultarla de nuevo en unos segundos." }, { status: 202, headers: headersNoStore })
  }

  // Los duplicados salen arriba sin consumir una segunda cuota del límite.
  try {
    const { data: rateStatus, error: rateError } = await adminClient.rpc("check_and_record_api_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "video-generate",
      p_short_limit: VIDEO_RATE_LIMIT_MAX,
      p_short_window_seconds: VIDEO_RATE_LIMIT_WINDOW_MS / 1_000,
      p_daily_limit: VIDEO_RATE_LIMIT_DAILY_MAX,
    })

    if (rateError) throw rateError

    if (rateStatus === "short_limit" || rateStatus === "daily_limit") {
      await markVideoStartFailed(user.id, idempotencyKey)
      return NextResponse.json(
        { success: false, error: "Demasiadas solicitudes. Intenta nuevamente en unos segundos." },
        { status: 429, headers: rateStatus === "short_limit"
          ? { ...headersNoStore, "Retry-After": String(VIDEO_RATE_LIMIT_WINDOW_MS / 1_000) }
          : headersNoStore }
      )
    }

    if (rateStatus !== "allowed") throw new Error("Unexpected rate limit result")
  } catch {
    await markVideoStartFailed(user.id, idempotencyKey)
    return NextResponse.json(
      { success: false, error: "No se pudo verificar el límite de solicitudes" },
      { status: 500, headers: headersNoStore }
    )
  }

  // Reservar antes del único START/Submit cobrable. El RPC valida el saldo de forma atómica.
  // One key per claimed request; START and STATUS refund this same reservation.
  const reservationKey = videoReservationKey(idempotencyKey)
  const reservation = await reserveVideoCredits(user.id, reservationKey, videoModel.credits)
  if (!reservation.ok) {
    await markVideoStartFailed(user.id, idempotencyKey)
    return reservation.status === 402
      ? NextResponse.json(
          { success: false, error: "Créditos insuficientes", requiredCredits: videoModel.credits },
          { status: 402, headers: headersNoStore }
        )
      : NextResponse.json(
          { success: false, error: "No pudimos verificar tus créditos. Inténtalo nuevamente en unos minutos." },
          { status: 503, headers: headersNoStore }
        )
  }
  const remainingCredits = reservation.balance

  // START did not create a job: refund this exact reservation once, then answer.
  const failAndRefund = async (error: string) => {
    await refundVideoCredits(user.id, reservationKey)
    await markVideoStartFailed(user.id, idempotencyKey)
    return NextResponse.json({ success: false, error }, { status: 502, headers: headersNoStore })
  }

  let timeout: ReturnType<typeof setTimeout> | undefined
  let n8nResponse: Response
  let n8nData: unknown

  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), N8N_VIDEO_TIMEOUT_MS)

    n8nResponse = await fetch(n8nVideoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      // model/falModel/duration/resolution are set by the server; Pro fields are scene metadata.
      body: JSON.stringify(startPayload),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const contentType = n8nResponse.headers.get("content-type")

    if (!contentType?.includes("application/json")) {
      // Same body as before: this response never carried success: false.
      await refundVideoCredits(user.id, reservationKey)
      await markVideoStartFailed(user.id, idempotencyKey)
      return NextResponse.json({ error: "Respuesta inesperada del servicio de video" }, { status: 502, headers: headersNoStore })
    }

    n8nData = await n8nResponse.json()
  } catch (err: unknown) {
    if (timeout) clearTimeout(timeout)
    const isAbort = err instanceof DOMException && err.name === "AbortError"
    return await failAndRefund(isAbort ? "El servicio de video tardó demasiado" : "Error al conectar con el servicio de video")
  }

  const isProcessing =
    n8nResponse.ok &&
    typeof n8nData === "object" &&
    n8nData !== null &&
    (n8nData as Record<string, unknown>).success === true &&
    (n8nData as Record<string, unknown>).status === "processing" &&
    typeof (n8nData as Record<string, unknown>).requestId === "string" &&
    typeof (n8nData as Record<string, unknown>).statusUrl === "string" &&
    typeof (n8nData as Record<string, unknown>).responseUrl === "string"

  if (!isProcessing) {
    const errorMsg =
      typeof (n8nData as Record<string, unknown>)?.error === "string"
        ? (n8nData as Record<string, unknown>).error as string
        : "El servicio de video no pudo procesar la solicitud"
    return await failAndRefund(errorMsg)
  }

  // ---- START created the job: from here on, never refund or submit again ----
  const d = n8nData as Record<string, unknown>
  await markVideoStartStarted(user.id, idempotencyKey, {
    requestId: d.requestId as string,
    statusUrl: d.statusUrl as string,
    responseUrl: d.responseUrl as string,
  }, remainingCredits)
  return NextResponse.json(
    {
      success: true,
      status: "processing",
      requestId: d.requestId as string,
      statusUrl: d.statusUrl as string,
      responseUrl: d.responseUrl as string,
      remainingCredits,
    },
    { status: 200, headers: headersNoStore }
  )
}
