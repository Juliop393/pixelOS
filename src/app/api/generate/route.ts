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

function getSupabaseStorageDomain(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

function isValidReferenceUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return true // null is valid (no reference)
  if (url.length > 2048) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  // Only HTTPS
  if (parsed.protocol !== "https:") return false

  // Block localhost and loopback
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname)) return false

  // Block private IPs (simple check)
  if (parsed.hostname.match(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/)) return false

  // Block credentials
  if (parsed.username || parsed.password) return false

  // Allow only Supabase Storage
  const allowedDomain = getSupabaseStorageDomain()
  if (allowedDomain && parsed.hostname !== allowedDomain) return false

  return true
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
  if (!isValidReferenceUrl(imagenReferencia)) return { error: "URL de referencia no permitida" }

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

    if (logoUrl && !isValidReferenceUrl(logoUrl)) return { error: "URL del logo no permitida" } as const
    if (faceUrl && !isValidReferenceUrl(faceUrl)) return { error: "URL de la foto no permitida" } as const

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

async function refundCredit(userId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.rpc("refund_credits", {
      p_user_id: userId,
      p_amount: 1,
    })
    if (error) {
      console.error("refund_credits RPC error:", error.message)
      return false
    }
    if (typeof data !== "number") {
      console.error("refund_credits returned unexpected type:", typeof data)
      return false
    }
    return true
  } catch (e) {
    console.error("refund_credits exception:", e)
    return false
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
  let newCredits = 0
  let creditReserved = false

  try {
    const adminClient = createAdminClient()
    const { data: reserveData, error: reserveError } = await adminClient.rpc("reserve_credits", {
      p_user_id: user.id,
      p_amount: 1,
    })

    if (reserveError || typeof reserveData !== "number") {
      return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402, headers: headersNoStore })
    }

    newCredits = reserveData
    creditReserved = true
  } catch {
    return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402, headers: headersNoStore })
  }

  // ---- Call n8n with timeout ----
  let n8nFailed = false
  let refunded = false
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS)

    const n8nResponse = await fetch(n8nUrl, {
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
      n8nFailed = true
      return NextResponse.json({ error: "Respuesta inesperada del servicio de generación", credits: newCredits }, { status: 502, headers: headersNoStore })
    }

    const n8nData = await n8nResponse.json()
    const isSuccess =
      n8nResponse.ok &&
      typeof n8nData === "object" &&
      n8nData !== null &&
      (n8nData as Record<string, unknown>).success === true

    if (isSuccess) {
      return NextResponse.json(
        { ...(n8nData as Record<string, unknown>), credits: newCredits },
        { status: 200, headers: headersNoStore }
      )
    }

    n8nFailed = true
    return NextResponse.json({ error: "El servicio de generación no pudo procesar la solicitud", credits: newCredits }, { status: 502, headers: headersNoStore })

  } catch (err: unknown) {
    if (timeout) clearTimeout(timeout)
    n8nFailed = true
    const isAbort = err instanceof DOMException && err.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "El servicio de generación tardó demasiado" : "Error al conectar con el servicio de generación", credits: newCredits },
      { status: 502, headers: headersNoStore }
    )
  } finally {
    // Only refund if n8n failed AND we haven't already refunded
    if (n8nFailed && creditReserved) {
      refunded = await refundCredit(user.id)
      if (!refunded) {
        console.error("Failed to refund credit for user:", user.id)
      }
    }
  }
}
