import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const MIN_MERGE_URLS = 2
const MAX_MERGE_URLS = 10
const N8N_MERGE_TIMEOUT_MS = 360_000
const headersNoStore = { "Cache-Control": "no-store" }

function isValidVideoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("https://")) return false

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return false
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) return false
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(url.hostname)) return false
    return true
  } catch {
    return false
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  if (typeof body !== "object" || body === null || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !("urls" in body)) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  const { urls } = body
  if (!Array.isArray(urls) || urls.length < MIN_MERGE_URLS || urls.length > MAX_MERGE_URLS ||
      !urls.every(isValidVideoUrl)) {
    return NextResponse.json({ error: "Se requieren entre 2 y 10 URLs HTTPS válidas" }, { status: 400, headers: headersNoStore })
  }

  const mergeWebhookUrl = process.env.N8N_VIDEO_MERGE_WEBHOOK_URL
  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!mergeWebhookUrl || !internalSecret) {
    return NextResponse.json({ error: "Servicio de unión de video no configurado" }, { status: 500, headers: headersNoStore })
  }

  try {
    const n8nResponse = await fetch(mergeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify({ urls }),
      signal: AbortSignal.timeout(N8N_MERGE_TIMEOUT_MS),
    })

    if (!n8nResponse.ok || !n8nResponse.headers.get("content-type")?.toLowerCase().includes("video/mp4") ||
        !n8nResponse.body) {
      return NextResponse.json({ error: "El servicio no pudo unir el video" }, { status: 502, headers: headersNoStore })
    }

    return new NextResponse(n8nResponse.body, {
      status: 200,
      headers: {
        ...headersNoStore,
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="pixelfm-final.mp4"',
      },
    })
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con el servicio de unión de video" }, { status: 502, headers: headersNoStore })
  }
}
