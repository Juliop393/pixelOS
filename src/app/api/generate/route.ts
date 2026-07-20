import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }

  const token = authHeader.slice(7)

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sesión inválida" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud inválido" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json(
      { error: "Servicio de generación no configurado" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  // Ignorar cualquier userId enviado por el cliente; usar el de la sesión autenticada.
  const { userId: _clientUserId, ...safeBody } = body as Record<string, unknown> & { userId?: unknown }

  const payload = { ...safeBody, userId: user.id }

  try {
    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const contentType = n8nResponse.headers.get("content-type")
    let n8nData: unknown

    if (contentType?.includes("application/json")) {
      n8nData = await n8nResponse.json()
    } else {
      return NextResponse.json(
        { error: "Respuesta inesperada del servicio de generación" },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      )
    }

    return NextResponse.json(n8nData, {
      status: n8nResponse.ok ? 200 : n8nResponse.status,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con el servicio de generación" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
