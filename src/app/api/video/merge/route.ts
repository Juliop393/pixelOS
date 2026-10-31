import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

const MIN_MERGE_URLS = 2
const MAX_MERGE_URLS = 10
const N8N_MERGE_TIMEOUT_MS = 360_000
const MAX_FINAL_VIDEO_BYTES = 100 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
const VIDEO_BUCKET = "videos"
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

function getOwnedScenePath(value: string, supabaseOrigin: string, userId: string): string | null {
  const url = new URL(value)
  const prefix = "/storage/v1/object/sign/videos/"
  if (url.origin !== supabaseOrigin || !url.pathname.startsWith(prefix) || !url.searchParams.get("token")) return null
  try {
    const path = decodeURIComponent(url.pathname.slice(prefix.length))
    return path.startsWith(`${userId}/scenes/`) &&
      /^[0-9a-f]{64}\.mp4$/.test(path.slice(`${userId}/scenes/`.length)) ? path : null
  } catch {
    return null
  }
}

async function readLimitedMp4(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_FINAL_VIDEO_BYTES) throw new Error("video_too_large")
  if (!response.body) throw new Error("empty_video")
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > MAX_FINAL_VIDEO_BYTES) {
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
  return mp4
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

  let admin: ReturnType<typeof createAdminClient>
  let mergeUrls: string[]
  try {
    admin = createAdminClient()
    const supabaseOrigin = new URL(supabaseUrl).origin
    const scenePaths = urls.map((url) => getOwnedScenePath(url, supabaseOrigin, user.id))
    if (scenePaths.some((path) => path === null)) {
      return NextResponse.json({ error: "Solo puedes unir escenas guardadas en tu biblioteca" }, { status: 403, headers: headersNoStore })
    }
    const ownedPaths = scenePaths as string[]
    const uniquePaths = [...new Set(ownedPaths)]
    const { data: ownedAssets, error: assetsError } = await admin.from("creative_assets")
      .select("storage_path")
      .eq("user_id", user.id)
      .eq("media_type", "video")
      .eq("kind", "scene")
      .eq("bucket", VIDEO_BUCKET)
      .in("storage_path", uniquePaths)
    if (assetsError) {
      return NextResponse.json({ error: "No se pudieron verificar las escenas" }, { status: 503, headers: headersNoStore })
    }
    if (ownedAssets?.length !== uniquePaths.length) {
      return NextResponse.json({ error: "Una o más escenas no pertenecen a tu cuenta" }, { status: 403, headers: headersNoStore })
    }

    // Do not forward client-provided signed URLs to n8n; mint fresh URLs for owned assets.
    const signedScenes = await Promise.all(ownedPaths.map((path) =>
      admin.storage.from(VIDEO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    ))
    if (signedScenes.some(({ data, error }) => error || !data?.signedUrl)) {
      return NextResponse.json({ error: "No se pudo preparar una escena para unir" }, { status: 502, headers: headersNoStore })
    }
    mergeUrls = signedScenes.map(({ data }) => data!.signedUrl)
  } catch {
    return NextResponse.json({ error: "No se pudieron preparar las escenas" }, { status: 503, headers: headersNoStore })
  }

  try {
    const n8nResponse = await fetch(mergeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify({ urls: mergeUrls }),
      signal: AbortSignal.timeout(N8N_MERGE_TIMEOUT_MS),
    })

    if (!n8nResponse.ok || !n8nResponse.headers.get("content-type")?.toLowerCase().includes("video/mp4") ||
        !n8nResponse.body) {
      return NextResponse.json({ error: "El servicio no pudo unir el video" }, { status: 502, headers: headersNoStore })
    }

    const mp4 = await readLimitedMp4(n8nResponse)
    const assetId = randomUUID()
    const storagePath = `${user.id}/finals/${assetId}.mp4`
    const { error: uploadError } = await admin.storage.from(VIDEO_BUCKET).upload(storagePath, mp4, {
      contentType: "video/mp4",
      upsert: false,
    })
    if (uploadError) {
      return NextResponse.json({ error: "El video se unió, pero no se pudo guardar" }, { status: 502, headers: headersNoStore })
    }

    const { error: insertError } = await admin.from("creative_assets").insert({
      id: assetId,
      user_id: user.id,
      media_type: "video",
      kind: "final",
      bucket: VIDEO_BUCKET,
      storage_path: storagePath,
      public_url: null,
      metadata: { sceneCount: urls.length },
    })
    if (insertError) {
      try {
        const { error: cleanupError } = await admin.storage.from(VIDEO_BUCKET).remove([storagePath])
        if (cleanupError) console.error("Video MERGE orphan cleanup failed:", cleanupError.statusCode)
      } catch {
        console.error("Video MERGE orphan cleanup failed unexpectedly")
      }
      return NextResponse.json({ error: "El video se unió, pero no se pudo registrar" }, { status: 502, headers: headersNoStore })
    }

    const { data: signedFinal, error: signError } = await admin.storage.from(VIDEO_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
    if (signError || !signedFinal?.signedUrl) {
      return NextResponse.json({ error: "El video se guardó, pero no se pudo abrir" }, { status: 502, headers: headersNoStore })
    }
    return NextResponse.json({ success: true, videoUrl: signedFinal.signedUrl, assetId }, { headers: headersNoStore })
  } catch {
    return NextResponse.json({ error: "No se pudo completar o guardar el video final" }, { status: 502, headers: headersNoStore })
  }
}
