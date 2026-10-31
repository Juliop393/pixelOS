import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

const VIDEO_BUCKET = "videos"
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
const headersNoStore = { "Cache-Control": "no-store" }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
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

  const assetId = req.nextUrl.searchParams.get("assetId") ?? ""
  if (!UUID_PATTERN.test(assetId)) {
    return NextResponse.json({ error: "Asset inválido" }, { status: 400, headers: headersNoStore })
  }

  try {
    const admin = createAdminClient()
    const { data: asset, error: readError } = await admin.from("creative_assets")
      .select("kind,storage_path")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .eq("media_type", "video")
      .eq("bucket", VIDEO_BUCKET)
      .maybeSingle()
    if (readError) throw new Error("catalog_read_failed")
    if (!asset || (asset.kind !== "scene" && asset.kind !== "final")) {
      return NextResponse.json({ error: "Video no encontrado" }, { status: 404, headers: headersNoStore })
    }

    const folder = asset.kind === "scene" ? "scenes" : "finals"
    const prefix = `${user.id}/${folder}/`
    const fileName = asset.storage_path.startsWith(prefix) ? asset.storage_path.slice(prefix.length) : ""
    if (!/^[A-Za-z0-9_-]+\.mp4$/i.test(fileName)) {
      return NextResponse.json({ error: "Video no disponible" }, { status: 404, headers: headersNoStore })
    }

    const { data, error } = await admin.storage.from(VIDEO_BUCKET)
      .createSignedUrl(asset.storage_path, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) throw new Error("signed_url_failed")
    const downloadUrl = new URL(data.signedUrl)
    downloadUrl.searchParams.set("download", asset.kind === "final" ? "pixelfm-final.mp4" : "pixelfm-escena.mp4")
    return NextResponse.json({ videoUrl: data.signedUrl, downloadUrl: downloadUrl.toString() }, { headers: headersNoStore })
  } catch {
    return NextResponse.json({ error: "No se pudo preparar el video" }, { status: 502, headers: headersNoStore })
  }
}
