import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { createAdminClient } from "@/lib/supabase-admin"

// El webhook necesita el body crudo para verificar la firma y la service_role
// key para escribir saltándose RLS, así que forzamos runtime Node y dinámico.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// variant_id de Lemon Squeezy -> créditos del plan
const CREDITS_BY_VARIANT: Record<string, number> = {
  "1842724": 40, // Starter ($5.99/mes)
  "1842974": 150, // Pro ($19.99/mes)
  "1842976": 500, // Business ($49.99/mes)
}

// Compara la firma X-Signature (HMAC-SHA256 hex) contra el body crudo.
function isValidSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")

  const expectedBuf = Buffer.from(expected, "hex")
  const receivedBuf = Buffer.from(signature, "hex")

  if (expectedBuf.length !== receivedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, receivedBuf)
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error("[lemonsqueezy] Falta LEMONSQUEEZY_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // Body crudo: imprescindible para que la firma cuadre.
  const rawBody = await request.text()
  const signature = request.headers.get("X-Signature")

  if (!isValidSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: { user_id?: string } }
    data?: { attributes?: { variant_id?: number | string; status?: string } }
  }

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventName = payload.meta?.event_name
  const userId = payload.meta?.custom_data?.user_id

  if (!eventName) {
    return NextResponse.json({ error: "Missing event_name" }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    if (eventName === "subscription_created" || eventName === "subscription_updated") {
      if (!userId) {
        console.error("[lemonsqueezy] Falta custom_data.user_id en", eventName)
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
      }

      const variantId = String(payload.data?.attributes?.variant_id ?? "")
      const credits = CREDITS_BY_VARIANT[variantId]

      if (credits === undefined) {
        console.error("[lemonsqueezy] variant_id desconocido:", variantId)
        return NextResponse.json({ error: "Unknown variant_id" }, { status: 400 })
      }

      // El estado de cancelación también llega como subscription_updated, así
      // que respetamos el status real que envía Lemon Squeezy.
      const status = payload.data?.attributes?.status ?? "active"

      const { error } = await supabase.from("user_credits").upsert(
        {
          user_id: userId,
          credits,
          subscription_status: status,
        },
        { onConflict: "user_id" }
      )

      if (error) throw error

      console.log(`[lemonsqueezy] ${eventName}: user ${userId} -> ${credits} créditos (${status})`)
    } else if (eventName === "subscription_cancelled") {
      if (!userId) {
        console.error("[lemonsqueezy] Falta custom_data.user_id en cancelación")
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
      }

      const { error } = await supabase
        .from("user_credits")
        .update({ subscription_status: "cancelled" })
        .eq("user_id", userId)

      if (error) throw error

      console.log(`[lemonsqueezy] subscription_cancelled: user ${userId}`)
    } else {
      // Evento que no nos interesa: lo aceptamos para que LS no reintente.
      console.log(`[lemonsqueezy] evento ignorado: ${eventName}`)
    }
  } catch (error) {
    console.error("[lemonsqueezy] Error procesando webhook:", error)
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
