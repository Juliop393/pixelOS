import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const PLAN_CREDITS: Record<string, number> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER || ""]: 40,
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO || ""]: 150,
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS || ""]: 500,
}

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000 // 5 minutes

function parseSignature(signatureHeader: string | null): { ts: number; h1: string } | null {
  if (!signatureHeader) return null

  const parts = signatureHeader.split(";").reduce((acc, part) => {
    const eq = part.indexOf("=")
    if (eq > 0) acc[part.slice(0, eq)] = part.slice(eq + 1)
    return acc
  }, {} as Record<string, string>)

  const tsRaw = parts["ts"]
  const h1 = parts["h1"]

  if (!tsRaw || !h1) return null

  const ts = Number(tsRaw)
  if (isNaN(ts) || ts <= 0) return null

  return { ts, h1 }
}

function verifyHmac(rawBody: string, ts: number, h1: string): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return false

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex")

  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(h1, "hex")

  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(req: NextRequest) {
  // ---- Parse body ----
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: "Cuerpo no legible" }, { status: 400 })
  }

  // ---- Verify signature with time tolerance ----
  const signatureHeader = req.headers.get("paddle-signature") || req.headers.get("Paddle-Signature")
  if (!signatureHeader) {
    return NextResponse.json({ error: "Firma ausente" }, { status: 400 })
  }

  const parsed = parseSignature(signatureHeader)
  if (!parsed) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
  }

  if (!verifyHmac(rawBody, parsed.ts, parsed.h1)) {
    return NextResponse.json({ error: "Firma no coincide" }, { status: 401 })
  }

  // Time tolerance
  const signatureAge = Math.abs(Date.now() - parsed.ts * 1000)
  if (signatureAge > SIGNATURE_TOLERANCE_MS) {
    return NextResponse.json({ error: "Timestamp fuera de tolerancia" }, { status: 400 })
  }

  // ---- Parse event ----
  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const eventId = typeof event.event_id === "string" ? event.event_id : ""
  const eventType = typeof event.event_type === "string" ? event.event_type : (typeof event.type === "string" ? event.type : "")
  const data = (typeof event.data === "object" && event.data !== null ? event.data : {}) as Record<string, unknown>

  if (!eventId || !eventType) {
    return NextResponse.json({ error: "event_id/event_type requeridos" }, { status: 400 })
  }

  const occurredAt = typeof data.occurred_at === "string" ? new Date(data.occurred_at) : new Date()
  if (isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "occurred_at inválido" }, { status: 400 })
  }

  // ---- Idempotency: atomic insert of event_id as "processing" ----
  const admin = getAdminClient()

  const { error: insertErr } = await admin
    .from("paddle_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      occurred_at: occurredAt.toISOString(),
      status: "processing",
    })

  if (insertErr) {
    // Duplicate key → event already seen
    const { data: existing } = await admin
      .from("paddle_webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle()

    const status = (existing as { status?: string } | null)?.status

    if (status === "processed" || status === "ignored") {
      return NextResponse.json({ success: true, deduplicated: true })
    }

    if (status === "processing") {
      // Another request is already handling this event — skip safely
      return NextResponse.json({ success: true, concurrent: true })
    }

    // "failed" status → allow retry
  }

  // ---- Guardar `last_paddle_occurred_at` en el usuario ANTES de procesar eventos de subscripción para manejar fuera-de-orden. No es crítico para el funcionamiento pero es necesario para la consistencia.

  // This is a simplified check: we only handle subscription events. 
  // If the event's occurred_at is older than what we already have, skip it.
  const eventData = data as Record<string, unknown>
  const customData = (eventData.custom_data ?? {}) as Record<string, unknown>
  const userId = typeof customData.user_id === "string" ? customData.user_id : undefined
  if (userId) {
    // Use the `last_paddle_occurred_at` from user_credits to detect stale events
    // Skip this check for canceled events (we want them to always update status)
    const isSubEvent = eventType === "subscription.activated" || eventType === "subscription.created" || eventType === "subscription.updated"
    if (isSubEvent) {
      const { data: current } = await admin
        .from("user_credits")
        .select("last_paddle_occurred_at")
        .eq("user_id", userId)
        .maybeSingle()

      const lastTs = (current as { last_paddle_occurred_at?: string } | null)?.last_paddle_occurred_at
      if (lastTs) {
        const lastDate = new Date(lastTs)
        if (occurredAt <= lastDate) {
          // Mark as ignored (stale)
          await admin
            .from("paddle_webhook_events")
            .update({ status: "ignored", processed_at: new Date().toISOString() })
            .eq("event_id", eventId)

          return NextResponse.json({ success: true, stale: true })
        }
      }
    }
  }

  // ---- Process the event ----
  try {
    if (eventType === "subscription.activated" || eventType === "subscription.created") {
      if (!userId) {
        return NextResponse.json({ error: "Sin user_id" }, { status: 400 })
      }

      const items = (eventData.items as Array<Record<string, unknown>> | undefined) ?? []
      const firstPrice = items.length > 0 ? (items[0]?.price as Record<string, unknown> | undefined) : undefined
      const priceId = firstPrice && typeof firstPrice.id === "string" ? firstPrice.id : (items.length > 0 && typeof items[0]?.price_id === "string" ? items[0].price_id : "")
      const credits = PLAN_CREDITS[priceId]

      if (!credits) {
        return NextResponse.json({ error: "price_id no reconocido" }, { status: 400 })
      }

      const { error } = await admin
        .from("user_credits")
        .upsert({
          user_id: userId,
          credits,
          plan: credits >= 500 ? "business" : credits >= 150 ? "pro" : "starter",
          subscription_status: "active",
          paddle_subscription_id: typeof eventData.id === "string" ? eventData.id : null,
          paddle_customer_id: typeof eventData.customer_id === "string" ? eventData.customer_id : null,
          last_paddle_occurred_at: occurredAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })

      if (error) throw error
    } else if (eventType === "subscription.canceled") {
      if (!userId) {
        return NextResponse.json({ error: "Sin user_id" }, { status: 400 })
      }

      const { error } = await admin
        .from("user_credits")
        .update({
          subscription_status: "cancelled",
          last_paddle_occurred_at: occurredAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (error) throw error
    } else {
      // Unknown event — mark as ignored
      await admin
        .from("paddle_webhook_events")
        .update({ status: "ignored", processed_at: new Date().toISOString() })
        .eq("event_id", eventId)

      return NextResponse.json({ success: true, ignored: eventType })
    }

    // Mark as processed
    await admin
      .from("paddle_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", eventId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido"

    // Mark as failed so Paddle can retry
    await admin
      .from("paddle_webhook_events")
      .update({ status: "failed", error_message: msg })
      .eq("event_id", eventId)

    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}