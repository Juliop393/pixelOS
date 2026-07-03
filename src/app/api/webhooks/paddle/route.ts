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
  if (!secret || !signatureHeader) {
    console.error("verifySignature: falta secret o signatureHeader", {
      hasSecret: !!secret,
      hasSignature: !!signatureHeader,
    })
    return false
  }

  // El header de Paddle tiene formato: ts=<timestamp>;h1=<hmac-hex>
  const parts = signatureHeader.split(";").reduce((acc, part) => {
    const [key, value] = part.split("=")
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const ts = parts["ts"]
  const h1 = parts["h1"]

  if (!ts || !h1) {
    console.error("verifySignature: formato de firma inválido", { signatureHeader })
    return false
  }

  // Paddle firma: HMAC-SHA256(secret, ts + ":" + rawBody)
  const signedPayload = `${ts}:${rawBody}`
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex")

  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(h1, "hex")

  if (a.length !== b.length) {
    console.error("verifySignature: longitudes distintas", {
      expectedLen: a.length,
      gotLen: b.length,
      h1,
      expected,
    })
    return false
  }

  return crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Debug logs
    console.log("Webhook Paddle recibido:", {
      headers: Object.fromEntries(req.headers.entries()),
      bodyPreview: rawBody.substring(0, 500),
    })

    const signatureHeader = req.headers.get("paddle-signature") || req.headers.get("Paddle-Signature")

    if (!verifySignature(rawBody, signatureHeader)) {
      console.error("Firma inválida", { signatureHeader })
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const eventType: string = event.event_type || event.type || ""
    const data = event.data || {}

    console.log("Webhook evento:", eventType)

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