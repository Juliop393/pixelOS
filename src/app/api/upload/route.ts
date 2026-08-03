import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_BUCKETS = ["referencias", "brand-assets"]
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const headersNoStore = { "Cache-Control": "no-store" }

const UPLOAD_SHORT_LIMIT = 12
const UPLOAD_SHORT_SECONDS = 300
const UPLOAD_DAILY_LIMIT = 100

interface DetectedFormat {
  ext: string
  mime: string
}

function detectType(bytes: Uint8Array): DetectedFormat | null {
  if (bytes.length < 4) return null

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" }
  }

  // WebP: RIFF????WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50   // "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" }
  }

  return null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !key) return null
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function authenticate(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) return null

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))

  if (error || !user) return null
  return user
}

export async function POST(req: NextRequest) {
  // ---- Auth ----
  const user = await authenticate(req)
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: headersNoStore })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: headersNoStore })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const bucket = (formData.get("bucket") as string) || "referencias"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400, headers: headersNoStore })
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Bucket no permitido" }, { status: 400, headers: headersNoStore })
    }

    if (!file.name || file.name.length > 255) {
      return NextResponse.json({ error: "Nombre de archivo no válido" }, { status: 400, headers: headersNoStore })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400, headers: headersNoStore })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera los 5 MB" }, { status: 400, headers: headersNoStore })
    }

    // Read first 16 bytes for magic byte detection
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer.slice(0, 16))

    const detected = detectType(bytes)
    if (!detected) {
      return NextResponse.json({ error: "Formato de archivo no permitido. Usa JPEG, PNG o WebP" }, { status: 400, headers: headersNoStore })
    }

    const buffer = Buffer.from(arrayBuffer)

    // ---- Atomic rate limit ----
    try {
      const admin = getSupabaseAdmin()
      if (!admin) throw new Error("Admin client unavailable")

      const { data: rateStatus, error: rateError } = await admin.rpc(
        "check_and_record_api_rate_limit",
        {
          p_user_id: user.id,
          p_endpoint: "upload",
          p_short_limit: UPLOAD_SHORT_LIMIT,
          p_short_window_seconds: UPLOAD_SHORT_SECONDS,
          p_daily_limit: UPLOAD_DAILY_LIMIT,
        }
      )

      if (rateError) throw rateError

      if (rateStatus === "short_limit") {
        return NextResponse.json(
          { error: "Estás subiendo demasiadas imágenes seguidas. Espera unos minutos e inténtalo nuevamente." },
          { status: 429, headers: { ...headersNoStore, "Retry-After": String(UPLOAD_SHORT_SECONDS) } }
        )
      }

      if (rateStatus === "daily_limit") {
        return NextResponse.json(
          { error: "Alcanzaste el límite diario de imágenes. Podrás volver a subir más adelante." },
          { status: 429, headers: headersNoStore }
        )
      }
    } catch (e) {
      console.error("Rate limit RPC failed for upload:", e)
      return NextResponse.json({ error: "Error interno al verificar límites" }, { status: 500, headers: headersNoStore })
    }

    // ---- Upload ----
    const randomPart = Math.random().toString(36).substring(2, 8)
    const name = `${Date.now()}-${randomPart}.${detected.ext}`
    const userPath = `${user.id}/${name}`

    const { error } = await supabaseAdmin.storage.from(bucket).upload(userPath, buffer, {
      contentType: detected.mime,
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Error al subir archivo a Supabase:", error.message)
      return NextResponse.json({ error: "Error al guardar el archivo" }, { status: 500, headers: headersNoStore })
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(userPath)

    return NextResponse.json({
      success: true,
      publicUrl: urlData.publicUrl,
      fileName: userPath,
    })
  } catch (err) {
    console.error("Error en API de upload:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: headersNoStore })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await authenticate(req)
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: headersNoStore })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: headersNoStore })
  }

  try {
    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get("fileName")
    const bucket = searchParams.get("bucket") || "referencias"

    if (!fileName) {
      return NextResponse.json({ error: "Falta el nombre del archivo" }, { status: 400, headers: headersNoStore })
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Bucket no permitido" }, { status: 400, headers: headersNoStore })
    }

    // Strict path validation: only user-owned files
    if (fileName.includes("..") || fileName.includes("\\") || fileName.includes("//")) {
      return NextResponse.json({ error: "Ruta no permitida" }, { status: 400, headers: headersNoStore })
    }

    const requiredPrefix = `${user.id}/`
    if (!fileName.startsWith(requiredPrefix)) {
      return NextResponse.json({ error: "No puedes eliminar este archivo" }, { status: 403, headers: headersNoStore })
    }

    const { error } = await supabaseAdmin.storage.from(bucket).remove([fileName])

    if (error) {
      console.error("Error al eliminar archivo de Supabase:", error.message)
      return NextResponse.json({ error: "Error al eliminar el archivo" }, { status: 500, headers: headersNoStore })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error en API de delete:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500, headers: headersNoStore })
  }
}