import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const N8N_STATUS_TIMEOUT_MS = 30_000
const headersNoStore = { "Cache-Control": "no-store" }

function isSafeHttpsUrl(value: string): boolean {
  if (!value || value.length > 2048) return false

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return false
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) return false
    if (url.hostname.match(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/)) return false
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : ""
  const statusUrl = typeof body.statusUrl === "string" ? body.statusUrl.trim() : ""
  const responseUrl = typeof body.responseUrl === "string" ? body.responseUrl.trim() : ""

  if (!/^[A-Za-z0-9._:-]{1,256}$/.test(requestId) || !isSafeHttpsUrl(statusUrl) || !isSafeHttpsUrl(responseUrl)) {
    return NextResponse.json({ error: "Datos de seguimiento inválidos" }, { status: 400, headers: headersNoStore })
  }

  const n8nStatusUrl = process.env.N8N_VIDEO_STATUS_WEBHOOK_URL
  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!n8nStatusUrl || !internalSecret) {
    return NextResponse.json({ error: "Servicio de estado de video no configurado" }, { status: 500, headers: headersNoStore })
  }

  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), N8N_STATUS_TIMEOUT_MS)

    const n8nResponse = await fetch(n8nStatusUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify({ requestId, statusUrl, responseUrl }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const contentType = n8nResponse.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ error: "Respuesta inesperada del servicio de estado" }, { status: 502, headers: headersNoStore })
    }

    const n8nData = await n8nResponse.json()
    if (!n8nResponse.ok || typeof n8nData !== "object" || n8nData === null) {
      return NextResponse.json({ error: "El servicio de estado no pudo procesar la solicitud" }, { status: 502, headers: headersNoStore })
    }

    const data = n8nData as Record<string, unknown>
    if (data.status === "processing") {
      return NextResponse.json({ success: true, status: "processing" }, { status: 200, headers: headersNoStore })
    }

    if (data.status === "completed" && typeof data.videoUrl === "string" && isSafeHttpsUrl(data.videoUrl)) {
      return NextResponse.json(
        { success: true, status: "completed", videoUrl: data.videoUrl },
        { status: 200, headers: headersNoStore }
      )
    }

    if (data.status === "error") {
      const error = typeof data.error === "string" ? data.error.slice(0, 500) : "No se pudo generar el video"
      return NextResponse.json({ success: false, status: "error", error }, { status: 200, headers: headersNoStore })
    }

    return NextResponse.json({ error: "Estado de video inesperado" }, { status: 502, headers: headersNoStore })
  } catch (error: unknown) {
    if (timeout) clearTimeout(timeout)
    const isAbort = error instanceof DOMException && error.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "La consulta de estado tardó demasiado" : "Error al consultar el estado del video" },
      { status: 502, headers: headersNoStore }
    )
  }
}
