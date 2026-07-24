import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_BUCKETS = ["referencias", "brand-assets"]
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authHeader.slice(7))

  if (error || !user) return null
  return user
}

function safeExtension(mime: string): string {
  return ALLOWED_MIME[mime] ?? ""
}

export async function POST(req: NextRequest) {
  const user = await authenticate(req)
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const bucket = (formData.get("bucket") as string) || "referencias"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Bucket no permitido" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera los 5 MB" }, { status: 400 })
    }

    const ext = safeExtension(file.type)
    if (!ext) {
      return NextResponse.json({ error: "Formato no permitido. Usa JPEG, PNG o WebP" }, { status: 400 })
    }

    const randomPart = Math.random().toString(36).substring(2, 8)
    const name = `${Date.now()}-${randomPart}.${ext}`
    const userPath = `${user.id}/${name}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(userPath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      console.error("Error al subir archivo a Supabase:", error.message)
      return NextResponse.json({ error: "Error al guardar el archivo" }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(userPath)

    return NextResponse.json({
      success: true,
      publicUrl: urlData.publicUrl,
      fileName: userPath,
    })
  } catch (err) {
    console.error("Error en API de upload:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await authenticate(req)
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get("fileName")
    const bucket = searchParams.get("bucket") || "referencias"

    if (!fileName) {
      return NextResponse.json({ error: "Falta el nombre del archivo" }, { status: 400 })
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Bucket no permitido" }, { status: 400 })
    }

    // Rechazar rutas con caracteres peligrosos o que no empiecen con el user.id
    if (fileName.includes("..") || fileName.includes("\\")) {
      return NextResponse.json({ error: "Ruta no permitida" }, { status: 400 })
    }

    const requiredPrefix = `${user.id}/`
    if (!fileName.startsWith(requiredPrefix)) {
      return NextResponse.json({ error: "No puedes eliminar este archivo" }, { status: 403 })
    }

    const { error } = await supabaseAdmin.storage.from(bucket).remove([fileName])

    if (error) {
      console.error("Error al eliminar archivo de Supabase:", error.message)
      return NextResponse.json({ error: "Error al eliminar el archivo" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error en API de delete:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
