import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "Sin user_id" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data: userCredits } = await supabaseAdmin
      .from("user_credits")
      .select("paddle_customer_id")
      .eq("user_id", userId)
      .maybeSingle()

    const customerId = userCredits?.paddle_customer_id

    if (!customerId) {
      return NextResponse.json({ error: "No tienes suscripción activa" }, { status: 400 })
    }

    const paddleApiKey = process.env.PADDLE_API_KEY
    if (!paddleApiKey) {
      return NextResponse.json({ error: "PADDLE_API_KEY no configurado" }, { status: 500 })
    }

    const res = await fetch(`https://api.paddle.com/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
      },
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("Paddle portal error:", data)
      return NextResponse.json({ error: data?.error?.detail || "Error al crear sesión del portal" }, { status: res.status })
    }

    const portalUrl = data.data?.url

    if (!portalUrl) {
      return NextResponse.json({ error: "No se obtuvo URL del portal" }, { status: 500 })
    }

    return NextResponse.json({ success: true, portalUrl })
  } catch (err) {
    console.error("Error portal route:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}