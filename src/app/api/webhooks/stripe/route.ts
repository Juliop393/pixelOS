import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe"
import { getStripePlanByPrice } from "@/lib/stripe-plans"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/*
 * Mirrors Stripe state into the stripe_* tables. The only path that may change
 * a balance is invoice.paid, through grant_stripe_invoice_credits (migration
 * 009): once per invoice, Starter only, and TEST invoices are only simulated.
 */

// Only invoices that open or renew a period earn monthly credits.
const GRANT_BILLING_REASONS = new Set(["subscription_create", "subscription_cycle"])

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

/** Skips (returns) invoices that do not qualify; throws when a grant should be retried. */
async function grantInvoiceCredits(admin: Admin, invoiceId: string, livemode: boolean) {
  // The key decides which Stripe account answers; a mismatch must never grant.
  const liveKey = (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")
  if (liveKey !== livemode) throw new Error("livemode_mismatch")

  const invoice = await getStripe().invoices.retrieve(invoiceId)
  const skip = (reason: string) => console.warn("Stripe invoice without credits:", reason)

  if (invoice.livemode !== livemode) throw new Error("livemode_mismatch")
  if (invoice.status !== "paid") return skip("not_paid")
  if (!GRANT_BILLING_REASONS.has(invoice.billing_reason ?? "")) return skip("billing_reason")

  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription)
  const customerId = idOf(invoice.customer)
  if (!subscriptionId || !customerId) return skip("no_subscription")
  if (invoice.lines.has_more) return skip("too_many_lines")

  const lines = invoice.lines.data.filter((line) => line.parent?.type === "subscription_item_details")
  const line = lines[0]
  if (lines.length !== 1 || line.parent?.subscription_item_details?.proration || line.quantity !== 1) {
    return skip("unexpected_lines")
  }

  const plan = getStripePlanByPrice(idOf(line.pricing?.price_details?.price))
  if (plan !== "starter") return skip("plan_not_supported")

  const { data: customer, error: customerError } = await admin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (customerError) throw new Error("customer_read_failed")
  if (!customer) throw new Error("invoice_without_user")

  const { data: result, error } = await admin.rpc("grant_stripe_invoice_credits", {
    p_invoice_id: invoice.id,
    p_user_id: customer.user_id,
    p_subscription_id: subscriptionId,
    p_plan: plan,
    p_livemode: livemode,
  })

  if (error) throw new Error(`credit_grant_failed: ${error.message.slice(0, 120)}`)
  if (!["applied", "simulated", "duplicate"].includes(result as string)) throw new Error("credit_grant_unexpected")
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
      if (event.type === "invoice.paid" && event.data.object.id) {
        await grantInvoiceCredits(admin, event.data.object.id, event.livemode)
      }
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
