import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const PLAN_CREDITS: Record<string, number> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER || ""]: 40,
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO || ""]: 150,
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS || ""]: 500,
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret || !signatureHeader) return false

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signatureHeader, "hex")
  )
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get("paddle-signature") || req.headers.get("X-Paddle-Signature")

    if (!verifySignature(rawBody, signatureHeader)) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const eventType: string = event.event_type || event.type || ""
    const data = event.data || {}

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    if (eventType === "subscription.activated" || eventType === "subscription.created") {
      const userId = data.custom_data?.user_id

      if (!userId) {
        return NextResponse.json({ error: "Sin user_id" }, { status: 400 })
      }

      const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id || ""
      const credits = PLAN_CREDITS[priceId]

      if (!credits) {
        return NextResponse.json({ error: "price_id no reconocido", priceId }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from("user_credits")
        .upsert({
          user_id: userId,
          credits,
          plan: credits >= 500 ? "business" : credits >= 150 ? "pro" : "starter",
          subscription_status: "active",
          paddle_subscription_id: data.id || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })

      if (error) {
        console.error("Error upsert user_credits:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, credits })
    }

    if (eventType === "subscription.canceled") {
      const userId = data.custom_data?.user_id

      if (!userId) {
        return NextResponse.json({ error: "Sin user_id" }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from("user_credits")
        .update({
          subscription_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (error) {
        console.error("Error update user_credits:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true, ignored: eventType })
  } catch (err) {
    console.error("Error webhook Paddle:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}