import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const headersNoStore = { "Cache-Control": "no-store" }

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500, headers: headersNoStore }
    )
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: headersNoStore }
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
      { status: 401, headers: headersNoStore }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud inválido" },
      { status: 400, headers: headersNoStore }
    )
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    return NextResponse.json(
      { error: "Servicio de generación no configurado" },
      { status: 500, headers: headersNoStore }
    )
  }

  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!internalSecret) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500, headers: headersNoStore }
    )
  }

  // Reservar crédito antes de llamar a n8n.
  let newCredits = 0
  let creditReserved = false

  try {
    const adminClient = createAdminClient()
    const { data: reserveData, error: reserveError } = await adminClient.rpc("reserve_credits", {
      p_user_id: user.id,
      p_amount: 1,
    })

    if (reserveError || typeof reserveData !== "number") {
      return NextResponse.json(
        { error: "Créditos insuficientes" },
        { status: 402, headers: headersNoStore }
      )
    }

    newCredits = reserveData
    creditReserved = true
  } catch {
    return NextResponse.json(
      { error: "Créditos insuficientes" },
      { status: 402, headers: headersNoStore }
    )
  }

  // Ignorar cualquier userId enviado por el cliente; usar el de la sesión autenticada.
  const { userId: _clientUserId, ...safeBody } = body as Record<string, unknown> & { userId?: unknown }
  const payload = { ...safeBody, userId: user.id }

  const refundLockedCredit = async () => {
    if (!creditReserved) return
    try {
      const adminClient = createAdminClient()
      const { data: refunded, error: refundError } = await adminClient.rpc("refund_credits", {
        p_user_id: user.id,
        p_amount: 1,
      })
      if (!refundError && typeof refunded === "number") {
        newCredits = refunded
      }
      creditReserved = false
    } catch {
      // El crédito ya fue devuelto por la RPC aunque el catch se active por
      // un error no relacionado; no ocultamos el fallo al frontend.
    }
  }

  try {
    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify(payload),
    })

    const contentType = n8nResponse.headers.get("content-type")

    if (!contentType?.includes("application/json")) {
      await refundLockedCredit()
      return NextResponse.json(
        { error: "Respuesta inesperada del servicio de generación", credits: newCredits },
        { status: 502, headers: headersNoStore }
      )
    }

    const n8nData = await n8nResponse.json()
    const isN8nSuccess =
      n8nResponse.ok &&
      typeof n8nData === "object" &&
      n8nData !== null &&
      (n8nData as Record<string, unknown>).success === true

    if (isN8nSuccess) {
      return NextResponse.json(
        { ...(n8nData as Record<string, unknown>), credits: newCredits },
        { status: 200, headers: headersNoStore }
      )
    }

    // n8n no devolvió success=true: reembolsar el crédito reservado.
    await refundLockedCredit()

    return NextResponse.json(
      { ...(n8nData as Record<string, unknown>), credits: newCredits },
      { status: n8nResponse.ok ? 200 : n8nResponse.status, headers: headersNoStore }
    )
  } catch {
    // Error de red o timeout al llamar a n8n: reembolsar.
    await refundLockedCredit()
    return NextResponse.json(
      { error: "Error al conectar con el servicio de generación", credits: newCredits },
      { status: 502, headers: headersNoStore }
    )
  }
}
