import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_ANGLES = [
  "comparison", "problem-solution", "primary-benefit", "social-proof",
  "product-demo", "usage-experience", "offer-convenience", "unique-mechanism",
]

const ALLOWED_STYLES = [
  "white-bg", "lifestyle", "product-action", "b2b",
  "premium-editorial", "benefits-infographic", "direct-offer", "minimal-tech",
]

const MAX_HOOK_CHARS = 2000

const N8N_VIDEO_TIMEOUT_MS = 360_000

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

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false
  if (url.length > 2048) return false

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") return false
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname)) return false
  if (parsed.hostname.match(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/)) return false
  if (parsed.username || parsed.password) return false

  const allowedDomain = getSupabaseStorageDomain()
  if (allowedDomain && parsed.hostname !== allowedDomain) return false

  return true
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

  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : ""
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl es obligatorio" }, { status: 400, headers: headersNoStore })
  }
  if (!isValidImageUrl(imageUrl)) {
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

  const prompt = buildVideoPrompt(angle, hook, style)

  const n8nVideoUrl = process.env.N8N_VIDEO_WEBHOOK_URL
  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!n8nVideoUrl || !internalSecret) {
    return NextResponse.json({ error: "Servicio de video no configurado" }, { status: 500, headers: headersNoStore })
  }

  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), N8N_VIDEO_TIMEOUT_MS)

    const n8nResponse = await fetch(n8nVideoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify({ imageUrl, prompt }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const contentType = n8nResponse.headers.get("content-type")

    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ error: "Respuesta inesperada del servicio de video" }, { status: 502, headers: headersNoStore })
    }

    const n8nData = await n8nResponse.json()

    const isProcessing =
      n8nResponse.ok &&
      typeof n8nData === "object" &&
      n8nData !== null &&
      (n8nData as Record<string, unknown>).success === true &&
      (n8nData as Record<string, unknown>).status === "processing" &&
      typeof (n8nData as Record<string, unknown>).requestId === "string" &&
      typeof (n8nData as Record<string, unknown>).statusUrl === "string" &&
      typeof (n8nData as Record<string, unknown>).responseUrl === "string"

    if (isProcessing) {
      const d = n8nData as Record<string, unknown>
      return NextResponse.json(
        {
          success: true,
          status: "processing",
          requestId: d.requestId as string,
          statusUrl: d.statusUrl as string,
          responseUrl: d.responseUrl as string,
        },
        { status: 200, headers: headersNoStore }
      )
    }

    const errorMsg =
      typeof (n8nData as Record<string, unknown>)?.error === "string"
        ? (n8nData as Record<string, unknown>).error as string
        : "El servicio de video no pudo procesar la solicitud"

    return NextResponse.json({ success: false, error: errorMsg }, { status: 502, headers: headersNoStore })

  } catch (err: unknown) {
    if (timeout) clearTimeout(timeout)
    const isAbort = err instanceof DOMException && err.name === "AbortError"
    return NextResponse.json(
      { success: false, error: isAbort ? "El servicio de video tardó demasiado" : "Error al conectar con el servicio de video" },
      { status: 502, headers: headersNoStore }
    )
  }
}
