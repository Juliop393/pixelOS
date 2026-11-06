import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe"
import { getStripePlanByPrice } from "@/lib/stripe-plans"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/*
 * This layer only mirrors Stripe state into the stripe_* tables.
 * It must never read or write user_credits: granting subscription credits is
 * a separate step, built on top of this one.
 */

const STALE_CLAIM_MS = 5 * 60 * 1000

type Admin = ReturnType<typeof createAdminClient>
type Claim = "claimed" | "done" | "in_progress"

const toDate = (seconds: number | null | undefined) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null

async function claimEvent(admin: Admin, event: Stripe.Event): Promise<Claim> {
  const { error } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    stripe_created_at: toDate(event.created),
  })

  if (!error) return "claimed"
  if (error.code !== "23505") throw new Error("event_claim_failed")

  // Seen before: retry only if it failed, or if its worker died mid-way.
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString()
  const { data: reclaimed, error: reclaimError } = await admin
    .from("stripe_webhook_events")
    .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
    .eq("event_id", event.id)
    .or(`status.eq.failed,and(status.eq.processing,updated_at.lt."${staleBefore}")`)
    .select("event_id")
    .maybeSingle()

  if (reclaimError) throw new Error("event_claim_failed")
  if (reclaimed) return "claimed"

  const { data: existing, error: readError } = await admin
    .from("stripe_webhook_events")
    .select("status")
    .eq("event_id", event.id)
    .maybeSingle()

  if (readError) throw new Error("event_claim_failed")
  return existing?.status === "processing" ? "in_progress" : "done"
}

async function finishEvent(admin: Admin, eventId: string, status: "processed" | "ignored" | "failed", message?: string) {
  const now = new Date().toISOString()
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      status,
      error_message: message ?? null,
      processed_at: status === "failed" ? null : now,
      updated_at: now,
    })
    .eq("event_id", eventId)

  if (error) throw new Error("event_finish_failed")
}

async function resolveUserId(admin: Admin, subscription: Stripe.Subscription, customerId: string, hint?: string | null) {
  const { data, error } = await admin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (error) throw new Error("customer_read_failed")

  const userId = data?.user_id ?? hint ?? subscription.metadata.supabase_user_id
  if (!userId) throw new Error("subscription_without_user")
  return userId as string
}

/** Always reads the live subscription, so events arriving out of order are harmless. */
async function syncSubscription(admin: Admin, subscriptionId: string, userHint?: string | null) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  const customerId = idOf(subscription.customer)
  if (!customerId) throw new Error("subscription_without_customer")

  const item = subscription.items.data[0]
  const priceId = item?.price.id ?? null

  const { error } = await admin.from("stripe_subscriptions").upsert(
    {
      stripe_subscription_id: subscription.id,
      user_id: await resolveUserId(admin, subscription, customerId, userHint),
      stripe_customer_id: customerId,
      status: subscription.status,
      stripe_price_id: priceId,
      plan: getStripePlanByPrice(priceId),
      current_period_start: toDate(item?.current_period_start),
      current_period_end: toDate(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: toDate(subscription.cancel_at),
      canceled_at: toDate(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  )

  if (error) throw new Error("subscription_write_failed")
}

/** Returns false when the event carries nothing this layer tracks. */
async function handleEvent(admin: Admin, event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed": {
      const subscriptionId = idOf(event.data.object.subscription)
      if (!subscriptionId) return false
      await syncSubscription(admin, subscriptionId, event.data.object.client_reference_id)
      return true
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(admin, event.data.object.id)
      return true
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscriptionId = idOf(event.data.object.parent?.subscription_details?.subscription)
      if (!subscriptionId) return false
      await syncSubscription(admin, subscriptionId)
      return true
    }
    default:
      return false
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Firma requerida" }, { status: 400 })

  let stripe: Stripe
  let secret: string
  try {
    stripe = getStripe()
    secret = getStripeWebhookSecret()
  } catch {
    console.error("Stripe webhook is not configured")
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  let admin: Admin
  let claim: Claim
  try {
    admin = createAdminClient()
    claim = await claimEvent(admin, event)
  } catch (error) {
    console.error("Stripe webhook claim failed:", error instanceof Error ? error.message : "unexpected")
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }

  if (claim === "done") return NextResponse.json({ received: true, deduplicated: true })
  // Not acknowledged: if that worker dies, Stripe's retry can still finish the event.
  if (claim === "in_progress") return NextResponse.json({ error: "Evento en proceso" }, { status: 409 })

  try {
    const handled = await handleEvent(admin, event)
    await finishEvent(admin, event.id, handled ? "processed" : "ignored")
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected"
    console.error("Stripe webhook failed:", event.type, message)
    await finishEvent(admin, event.id, "failed", message.slice(0, 500)).catch(() => undefined)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
