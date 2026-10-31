import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

const N8N_STATUS_TIMEOUT_MS = 30_000
const VIDEO_DOWNLOAD_TIMEOUT_MS = 120_000
const MAX_VIDEO_BYTES = 80 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
const VIDEO_BUCKET = "videos"
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

function isFalVideoUrl(value: string): boolean {
  if (!isSafeHttpsUrl(value)) return false
  const url = new URL(value)
  return (url.hostname === "fal.media" || url.hostname.endsWith(".fal.media")) && !url.port
}

async function getStoredScene(admin: ReturnType<typeof createAdminClient>, userId: string, storagePath: string) {
  const { data, error } = await admin.from("creative_assets")
    .select("id")
    .eq("user_id", userId)
    .eq("bucket", VIDEO_BUCKET)
    .eq("storage_path", storagePath)
    .eq("media_type", "video")
    .eq("kind", "scene")
    .maybeSingle()
  if (error) throw new Error("catalog_read_failed")
  return data
}

async function signStoredScene(admin: ReturnType<typeof createAdminClient>, assetId: string, storagePath: string) {
  const { data, error } = await admin.storage.from(VIDEO_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) throw new Error("signed_url_failed")
  return { assetId, videoUrl: data.signedUrl }
}

async function persistScene(admin: ReturnType<typeof createAdminClient>, userId: string, requestId: string, sourceUrl: string) {
  const fileId = createHash("sha256").update(requestId).digest("hex")
  const storagePath = `${userId}/scenes/${fileId}.mp4`
  const existing = await getStoredScene(admin, userId, storagePath)
  if (existing) return signStoredScene(admin, existing.id, storagePath)
  if (!isFalVideoUrl(sourceUrl)) throw new Error("invalid_source_url")

  const source = await fetch(sourceUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
  })
  if (!source.ok || !source.body) throw new Error("source_download_failed")
  const contentType = source.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase()
  if (contentType && contentType !== "video/mp4" && contentType !== "application/octet-stream") {
    throw new Error("invalid_video_type")
  }
  const contentLength = Number(source.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) throw new Error("video_too_large")

  const reader = source.body.getReader()
  const chunks: Buffer[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > MAX_VIDEO_BYTES) {
        await reader.cancel()
        throw new Error("video_too_large")
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  const mp4 = Buffer.concat(chunks, byteLength)
  if (mp4.length < 12 || mp4.toString("ascii", 4, 8) !== "ftyp") throw new Error("invalid_mp4")

  const { error: uploadError } = await admin.storage.from(VIDEO_BUCKET).upload(storagePath, mp4, {
    contentType: "video/mp4",
    upsert: false,
  })
  // Another STATUS request may have already uploaded this deterministic object.
  if (uploadError && uploadError.statusCode !== "409") throw new Error("storage_upload_failed")

  const { data: inserted, error: insertError } = await admin.from("creative_assets")
    .insert({
      user_id: userId,
      media_type: "video",
      kind: "scene",
      bucket: VIDEO_BUCKET,
      storage_path: storagePath,
      public_url: null,
      metadata: { requestId, source: "fal.ai" },
    })
    .select("id")
    .single()
  if (insertError && insertError.code !== "23505") throw new Error("catalog_insert_failed")
  const asset = inserted ?? await getStoredScene(admin, userId, storagePath)
  if (!asset) throw new Error("catalog_insert_failed")
  return signStoredScene(admin, asset.id, storagePath)
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

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : ""
  const statusUrl = typeof body.statusUrl === "string" ? body.statusUrl.trim() : ""
  const responseUrl = typeof body.responseUrl === "string" ? body.responseUrl.trim() : ""

  if (!/^[A-Za-z0-9._:-]{1,256}$/.test(requestId) || !isSafeHttpsUrl(statusUrl) || !isSafeHttpsUrl(responseUrl)) {
    return NextResponse.json({ error: "Datos de seguimiento inválidos" }, { status: 400, headers: headersNoStore })
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
    const { data: start, error: ownershipError } = await admin.from("video_start_requests")
      .select("status_url,response_url")
      .eq("user_id", user.id)
      .eq("request_id", requestId)
      .eq("status", "started")
      .limit(1)
      .maybeSingle()
    if (ownershipError) throw new Error("ownership_check_failed")
    if (!start || start.status_url !== statusUrl || start.response_url !== responseUrl) {
      return NextResponse.json({ error: "Solicitud de video no autorizada" }, { status: 403, headers: headersNoStore })
    }
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la solicitud de video" }, { status: 503, headers: headersNoStore })
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
      try {
        const stored = await persistScene(admin, user.id, requestId, data.videoUrl)
        return NextResponse.json({ success: true, status: "completed", ...stored }, { status: 200, headers: headersNoStore })
      } catch (error) {
        const reason = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "unexpected"
        console.error("Video STATUS clip persistence failed:", reason)
        return NextResponse.json(
          { success: false, status: "error", error: "El video se generó, pero no se pudo guardar. Intenta consultar el estado de nuevo." },
          { status: 502, headers: headersNoStore }
        )
      }
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
