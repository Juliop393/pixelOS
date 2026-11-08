import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

const ALLOWED_ANGLES = [
  "comparison", "problem-solution", "primary-benefit", "social-proof",
  "product-demo", "usage-experience", "offer-convenience", "unique-mechanism",
]

const ALLOWED_STYLES = [
  "white-bg", "lifestyle", "product-action", "b2b",
  "premium-editorial", "benefits-infographic", "direct-offer", "minimal-tech",
]

const ALLOWED_FORMATS = ["square", "story", "4:5"]

const MAX_PRODUCT_CHARS = 3000
const MAX_TITLE_CHARS = 180
const MAX_SUBTITLE_CHARS = 300

const N8N_TIMEOUT_MS = 90_000

const headersNoStore = { "Cache-Control": "no-store" }
const REFERENCE_BUCKETS = new Set(["referencias"])
const BRAND_ASSET_BUCKETS = new Set(["brand-assets"])
const GENERATED_IMAGE_BUCKETS = new Set(["creativos"])

function getSupabaseStorageOrigin(): URL | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" ? parsed : null
  } catch {
    return null
  }
}

function isValidStorageAssetUrl(
  url: string | null | undefined,
  userId: string,
  allowedBuckets: ReadonlySet<string>
): boolean {
  if (!url || typeof url !== "string") return true // null is valid (no reference)
  if (url.length > 2048) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") return false
  if (parsed.username || parsed.password) return false

  const storageOrigin = getSupabaseStorageOrigin()
  if (!storageOrigin || parsed.origin !== storageOrigin.origin) return false

  let segments: string[]
  try {
    segments = parsed.pathname.split("/").slice(1).map((segment) => decodeURIComponent(segment))
  } catch {
    return false
  }

  if (
    segments.length < 7 ||
    segments[0] !== "storage" ||
    segments[1] !== "v1" ||
    segments[2] !== "object" ||
    segments[3] !== "public"
  ) {
    return false
  }

  const bucket = segments[4]
  const ownerId = segments[5]
  const objectSegments = segments.slice(6)

  if (!allowedBuckets.has(bucket) || ownerId !== userId) return false
  if (objectSegments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return false
  }

  return true
}

function getGeneratedImageStoragePath(imageUrl: string, userId: string): string | null {
  if (!isValidStorageAssetUrl(imageUrl, userId, GENERATED_IMAGE_BUCKETS)) return null
  const parsed = new URL(imageUrl)
  if (parsed.search || parsed.hash) return null
  const segments = parsed.pathname.split("/").slice(1).map((segment) => decodeURIComponent(segment))
  if (segments.length !== 7 || !segments[6].toLowerCase().endsWith(".jpg")) return null
  return `${segments[5]}/${segments[6]}`
}

async function registerGeneratedImage(
  userId: string,
  imageUrl: string,
  storagePath: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin.from("creative_assets")
    .insert({
      user_id: userId,
      media_type: "image",
      kind: null,
      bucket: "creativos",
      storage_path: storagePath,
      public_url: imageUrl,
      title: typeof payload.producto === "string" ? payload.producto.slice(0, MAX_TITLE_CHARS) : null,
      format: payload.formato,
      metadata: { angle: payload.angulo, style: payload.estiloVisual },
    })
    .select("id")
    .single()
  if (!error && data) return data.id
  if (error?.code === "23505") {
    const { data: existing, error: readError } = await admin.from("creative_assets")
      .select("id")
      .eq("user_id", userId)
      .eq("bucket", "creativos")
      .eq("storage_path", storagePath)
      .maybeSingle()
    if (!readError && existing) return existing.id
  }
  throw new Error(error?.code ?? "catalog_insert_failed")
}

function buildCleanPayload(body: Record<string, unknown>, userId: string): Record<string, unknown> | { error: string } {
  const producto = typeof body.producto === "string" ? body.producto.trim().slice(0, MAX_PRODUCT_CHARS) : ""
  if (!producto) return { error: "La descripción del producto es obligatoria" }

  const textoAnuncio = typeof body.textoAnuncio === "string" ? body.textoAnuncio.trim().slice(0, MAX_TITLE_CHARS + MAX_SUBTITLE_CHARS) : null

  const ctaContacto = typeof body.ctaContacto === "string" ? body.ctaContacto.trim().slice(0, 200) : null

  const angulo = typeof body.angulo === "string" ? body.angulo : ""
  if (!ALLOWED_ANGLES.includes(angulo)) return { error: "Ángulo no válido" }

  const formato = typeof body.formato === "string" ? body.formato : ""
  if (!ALLOWED_FORMATS.includes(formato)) return { error: "Formato no válido" }

  const estiloVisual = typeof body.estiloVisual === "string" ? body.estiloVisual : ""
  if (!ALLOWED_STYLES.includes(estiloVisual)) return { error: "Estilo visual no válido" }

  const safeZoneMeta = typeof body.safeZoneMeta === "boolean" ? body.safeZoneMeta : false
  if (safeZoneMeta && formato !== "story") return { error: "Zona segura Meta solo aplica a formato 9:16" }

  const brandColor = typeof body.brandColor === "string" ? body.brandColor.trim().slice(0, 20) : null

  const imagenReferencia = typeof body.imagenReferencia === "string" ? body.imagenReferencia : null
  if (!isValidStorageAssetUrl(imagenReferencia, userId, REFERENCE_BUCKETS)) return { error: "URL de referencia no permitida" }

  const brandIdentity = (() => {
    const raw = body.brandIdentity
    if (raw === null || raw === undefined) return null
    if (typeof raw !== "object" || Array.isArray(raw)) return { error: "brandIdentity inválido" } as const

    const bi = raw as Record<string, unknown>

    const brandName = typeof bi.brandName === "string" ? bi.brandName.trim().slice(0, 100) : null

    const brandColors = Array.isArray(bi.brandColors) && bi.brandColors.length === 2 &&
      typeof bi.brandColors[0] === "string" && typeof bi.brandColors[1] === "string"
      ? (bi.brandColors as string[]).map((c: string) => c.trim().slice(0, 20))
      : null

    const hasLogo = typeof bi.hasLogo === "boolean" ? bi.hasLogo : false
    const hasFace = typeof bi.hasFace === "boolean" ? bi.hasFace : false

    const logoUrl = typeof bi.logoUrl === "string" ? bi.logoUrl.trim() : null
    const faceUrl = typeof bi.faceUrl === "string" ? bi.faceUrl.trim() : null

    if (logoUrl && !isValidStorageAssetUrl(logoUrl, userId, BRAND_ASSET_BUCKETS)) return { error: "URL del logo no permitida" } as const
    if (faceUrl && !isValidStorageAssetUrl(faceUrl, userId, BRAND_ASSET_BUCKETS)) return { error: "URL de la foto no permitida" } as const

    return { brandName, brandColors, hasLogo, logoUrl, hasFace, faceUrl }
  })()

  if (brandIdentity && "error" in brandIdentity) return brandIdentity

  return {
    producto,
    textoAnuncio,
    ctaContacto,
    angulo,
    formato,
    estiloVisual,
    brandColor,
    imagenReferencia,
    brandIdentity,
    safeZoneMeta,
    userId,
  }
}

const IMAGE_CREDIT_COST = 1

type ReserveResult = { ok: true; balance: number } | { ok: false; status: 402 | 503 }

const isBalance = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0

const rpcResult = (data: unknown): Record<string, unknown> | null =>
  typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : null

/*
 * Charges one image to the credit engine v2 under this request's key.
 * The key identifies this execution only: a client retry sends a new request
 * with a new key, so retries are not deduplicated here.
 */
async function reserveImageCredit(userId: string, reservationKey: string): Promise<ReserveResult> {
  try {
    const { data, error } = await createAdminClient().rpc("reserve_credits_v2", {
      p_user_id: userId,
      p_reservation_key: reservationKey,
      p_credits: IMAGE_CREDIT_COST,
    })
    if (error?.message === "insufficient_credits") return { ok: false, status: 402 }
    if (error) {
      console.error("reserve_credits_v2 failed:", error.message)
    } else {
      const result = rpcResult(data)
      if (result?.status === "reserved" && isBalance(result.balance)) return { ok: true, balance: result.balance }
      console.error("reserve_credits_v2 unexpected result:", result?.status ?? typeof data)
    }
  } catch (error) {
    console.error("reserve_credits_v2 exception:", error instanceof Error ? error.message : "unknown")
  }
  // A lost connection can hide a charge that did go through: release this key.
  await refundImageCredit(userId, reservationKey, "release")
  return { ok: false, status: 503 }
}

/**
 * Returns the balance after refunding exactly this reservation, or null if it failed.
 * "release" is the emergency path after an unconfirmed reservation: an absent
 * reservation is expected there, any other failure is logged with key and user.
 */
async function refundImageCredit(
  userId: string,
  reservationKey: string,
  mode: "refund" | "release" = "refund",
): Promise<number | null> {
  const fail = (reason: string) => {
    if (mode === "release") {
      console.error("Emergency credit release failed:", reason, "key:", reservationKey, "user:", userId)
    } else {
      console.error("refund_credits_v2 failed:", reason)
    }
    return null
  }
  try {
    const { data, error } = await createAdminClient().rpc("refund_credits_v2", {
      p_user_id: userId,
      p_reservation_key: reservationKey,
    })
    if (error) {
      if (mode === "release" && error.message === "reservation_not_found") return null
      return fail(error.message)
    }
    const result = rpcResult(data)
    if ((result?.status === "refunded" || result?.status === "already_refunded") && isBalance(result.balance)) {
      return result.balance
    }
    return fail(`unexpected result: ${result?.status ?? typeof data}`)
  } catch (error) {
    return fail(`exception: ${error instanceof Error ? error.message : "unknown"}`)
  }
}

export async function POST(req: NextRequest) {
  // ---- Config check ----
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: headersNoStore })
  }

  // ---- Auth ----
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: headersNoStore })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401, headers: headersNoStore })
  }

  // ---- Parse JSON ----
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  // ---- Validate & build clean payload ----
  const cleanPayload = buildCleanPayload(body, user.id)
  if ("error" in cleanPayload) {
    return NextResponse.json({ error: cleanPayload.error }, { status: 400, headers: headersNoStore })
  }

  // ---- Atomic rate limit (reuses existing RPC) ----
  const GEN_SHORT_LIMIT = 10
  const GEN_SHORT_SECONDS = 60
  const GEN_DAILY_LIMIT = 100

  try {
    const adminClient = createAdminClient()
    const { data: rateStatus, error: rateError } = await adminClient.rpc("check_and_record_api_rate_limit", {
      p_user_id: user.id,
      p_endpoint: "generate",
      p_short_limit: GEN_SHORT_LIMIT,
      p_short_window_seconds: GEN_SHORT_SECONDS,
      p_daily_limit: GEN_DAILY_LIMIT,
    })

    if (rateError) throw rateError

    if (rateStatus === "short_limit") {
      return NextResponse.json(
        { error: "Estás generando demasiado rápido. Espera un momento e inténtalo nuevamente." },
        { status: 429, headers: { ...headersNoStore, "Retry-After": String(GEN_SHORT_SECONDS) } }
      )
    }

    if (rateStatus === "daily_limit") {
      return NextResponse.json(
        { error: "Alcanzaste el límite diario de generación. Podrás volver a generar más adelante." },
        { status: 429, headers: headersNoStore }
      )
    }

    // rateStatus === "allowed" → continue

  } catch (e) {
    console.error("Rate limit RPC failed for generate:", e)
    return NextResponse.json({ error: "Error interno al verificar límites" }, { status: 500, headers: headersNoStore })
  }

  // ---- n8n config check ----
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!n8nUrl || !internalSecret) {
    return NextResponse.json({ error: "Servicio de generación no configurado" }, { status: 500, headers: headersNoStore })
  }

  // ---- Reserve credit (AFTER validation) ----
  // Server-made key for this execution; the same key is used for its refund.
  const reservationKey = `image:${randomUUID()}`
  const reservation = await reserveImageCredit(user.id, reservationKey)
  if (!reservation.ok) {
    return reservation.status === 402
      ? NextResponse.json({ error: "Créditos insuficientes" }, { status: 402, headers: headersNoStore })
      : NextResponse.json(
          { error: "No pudimos verificar tus créditos. Inténtalo nuevamente en unos minutos." },
          { status: 503, headers: headersNoStore }
        )
  }
  const newCredits = reservation.balance

  // n8n did not produce an image: refund this exact reservation before answering,
  // so the balance sent back already includes the refund.
  const failAndRefund = async (error: string) => {
    const refundedBalance = await refundImageCredit(user.id, reservationKey)
    if (refundedBalance === null) {
      console.error("Failed to refund image credit:", reservationKey, "user:", user.id)
    }
    return NextResponse.json(
      { error, credits: refundedBalance ?? newCredits },
      { status: 502, headers: headersNoStore }
    )
  }

  // ---- Call n8n with timeout ----
  let n8nResponse: Response
  let n8nData: unknown
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS)

    n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify(cleanPayload),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const contentType = n8nResponse.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      return await failAndRefund("Respuesta inesperada del servicio de generación")
    }

    n8nData = await n8nResponse.json()
  } catch (err: unknown) {
    if (timeout) clearTimeout(timeout)
    const isAbort = err instanceof DOMException && err.name === "AbortError"
    return await failAndRefund(
      isAbort ? "El servicio de generación tardó demasiado" : "Error al conectar con el servicio de generación"
    )
  }

  const isSuccess =
    n8nResponse.ok &&
    typeof n8nData === "object" &&
    n8nData !== null &&
    (n8nData as Record<string, unknown>).success === true

  if (!isSuccess) {
    return await failAndRefund("El servicio de generación no pudo procesar la solicitud")
  }

  // ---- n8n reported a generated image: from here on, never refund or rerun ----
  const resultData = n8nData as Record<string, unknown>
  const imageUrl = typeof resultData.imageUrl === "string" ? resultData.imageUrl : ""
  const storagePath = imageUrl ? getGeneratedImageStoragePath(imageUrl, user.id) : null
  if (!storagePath) {
    return NextResponse.json(
      { error: "El servicio no devolvió una imagen válida de tu cuenta", credits: newCredits },
      { status: 502, headers: headersNoStore }
    )
  }

  let assetId: string
  try {
    assetId = await registerGeneratedImage(user.id, imageUrl, storagePath, cleanPayload)
  } catch (error) {
    console.error("Image catalog registration failed:", error instanceof Error ? error.message : "unknown")
    return NextResponse.json(
      { error: "La imagen se generó, pero no se pudo registrar en Mis creativos", credits: newCredits },
      { status: 502, headers: headersNoStore }
    )
  }

  return NextResponse.json(
    {
      success: true,
      imageUrl,
      copy: typeof resultData.copy === "string" ? resultData.copy : null,
      credits: newCredits,
      assetId,
    },
    { status: 200, headers: headersNoStore }
  )
}
