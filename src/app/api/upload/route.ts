import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hc2Fjc25xaWxjcWx6eGh0b2hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc2NDUyNywiZXhwIjoyMDk2MzQwNTI3fQ.R61IiNjhLWPVCK_ubQbinHuKM0gKx3z3vDG7XHQWtGU"

// Cliente de Supabase con service_role (corre en el servidor, se salta RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const bucket = (formData.get("bucket") as string) || "referencias"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    // Generar un nombre de archivo único para evitar colisiones
    const fileExtension = file.name.split(".").pop() || "jpg"
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      console.error("Error al subir archivo a Supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      publicUrl,
      fileName,
    })
  } catch (err) {
    console.error("Error en API de upload:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get("fileName")
    const bucket = searchParams.get("bucket") || "referencias"

    if (!fileName) {
      return NextResponse.json({ error: "Falta el nombre del archivo" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([fileName])

    if (error) {
      console.error("Error al eliminar archivo de Supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error en API de delete:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
