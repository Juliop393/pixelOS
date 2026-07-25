import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

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

  const paddleApiKey = process.env.PADDLE_API_KEY
  if (!paddleApiKey) {
    return NextResponse.json(
      { error: "PADDLE_API_KEY no configurado" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  let customerId: string | null = null

  try {
    const adminClient = createAdminClient()
    const { data: userCredits, error: dbError } = await adminClient
      .from("user_credits")
      .select("paddle_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (dbError) {
      return NextResponse.json(
        { error: "Error al consultar la suscripción" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      )
    }

    customerId = userCredits?.paddle_customer_id ?? null
  } catch {
    return NextResponse.json(
      { error: "Error al consultar la suscripción" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }

  if (!customerId) {
    return NextResponse.json(
      { error: "No se encontró una suscripción activa" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }

  try {
    const res = await fetch(`https://api.paddle.com/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al crear sesión del portal" },
        { status: res.status, headers: { "Cache-Control": "no-store" } }
      )
    }

    const portalUrl = data.data?.urls?.general?.overview

    if (!portalUrl) {
      return NextResponse.json(
        { error: "No se obtuvo URL del portal" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      )
    }

    return NextResponse.json(
      { success: true, portalUrl },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con Paddle" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
