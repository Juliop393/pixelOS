import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe"
import { getPackAmountCents, getStripePackByPrice, PACK_CURRENCY } from "@/lib/stripe-packs"
import { getStripePriceInfo } from "@/lib/stripe-plans"
import { idOf, syncSubscription } from "@/lib/stripe-subscriptions"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/*
 * Mirrors Stripe state into the stripe_* tables. The only path that may change
 * a subscription balance is invoice.paid, through migration 014: once per
 * invoice and billing period, for Starter, Growth and Pro, monthly and annual
 * (annual credits month by month), keeping legacy and pack credits. TEST
 * invoices are only simulated. checkout.session.completed never grants.
 *
 * Credit pack payments (one-time Checkout) are recorded through
 * record_credit_pack_purchase_v2 (migration 013): one lot per PaymentIntent,
 * TEST lots only 'simulated' and never spendable, LIVE lots 'applied', added to
 * the balance through the credit engine and valid for 12 months.
 */

// Invoices that open or renew a period, or invoice a plan change right away.
const GRANT_BILLING_REASONS = new Set(["subscription_create", "subscription_cycle", "subscription_update"])

const STALE_CLAIM_MS = 5 * 60 * 1000

type Admin = ReturnType<typeof createAdminClient>
type Claim = "claimed" | "done" | "in_progress"

const toDate = (seconds: number | null | undefined) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null


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

/** Price of an invoice line, from its pricing details. */
const linePrice = (line: Stripe.InvoiceLineItem) => idOf(line.pricing?.price_details?.price)

/*
 * Grants the credits of a paid subscription invoice through migration 014.
 * Plan and interval always come from the Stripe Price that was paid; amounts
 * never come from Stripe or the browser, the database function decides them.
 *
 *   subscription_create / subscription_cycle: the single non-proration line is
 *     what was bought; its period is the period paid. Proration lines next to
 *     it (from an earlier plan change) are allowed and ignored.
 *   subscription_update (plan change invoiced right away): the subscription as
 *     it stands now is what was paid, for its current period, so the database
 *     tops up the same period (upgraded) instead of opening a new one.
 *
 * Monthly Prices go to grant_subscription_credits_v3 (one month per invoice).
 * Annual Prices never do: the year is delivered month by month through
 * deliver_annual_subscription_credits, which grants only the current month.
 *
 * Skips (returns) invoices that do not qualify; throws when a grant should be retried.
 */
async function grantInvoiceCredits(admin: Admin, invoiceId: string, livemode: boolean, subscription: Stripe.Subscription) {
  // The key decides which Stripe account answers; a mismatch must never grant.
  const liveKey = (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")
  if (liveKey !== livemode) throw new Error("livemode_mismatch")

  const invoice = await getStripe().invoices.retrieve(invoiceId)
  const skip = (reason: string) => console.warn("Stripe invoice without credits:", reason)

  if (invoice.livemode !== livemode) throw new Error("livemode_mismatch")
  if (invoice.status !== "paid") return skip("not_paid")
  const reason = invoice.billing_reason ?? ""
  if (!GRANT_BILLING_REASONS.has(reason)) return skip("billing_reason")

  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription)
  const customerId = idOf(invoice.customer)
  if (!subscriptionId || !customerId) return skip("no_subscription")
  if (subscriptionId !== subscription.id) throw new Error("subscription_mismatch")
  if (invoice.lines.has_more) return skip("too_many_lines")

  const lines = invoice.lines.data.filter((line) => line.parent?.type === "subscription_item_details")
  if (lines.length === 0 || lines.some((line) => line.quantity !== 1)) return skip("unexpected_lines")

  let priceId: string | null
  let periodStart: number | null | undefined
  let periodEnd: number | null | undefined
  if (reason === "subscription_update") {
    const items = subscription.items.data
    if (items.length !== 1 || items[0].quantity !== 1) return skip("unexpected_items")
    priceId = items[0].price.id
    // Only an invoice that charges the subscription's current Price pays for it.
    if (!lines.some((line) => linePrice(line) === priceId)) {
      // A paid upgrade whose pending update Stripe has not applied yet: retry, never drop its credits.
      if (subscription.pending_update) throw new Error("pending_update_not_applied")
      return skip("update_for_other_price")
    }
    periodStart = items[0].current_period_start
    periodEnd = items[0].current_period_end
  } else {
    const paid = lines.filter((line) => !line.parent?.subscription_item_details?.proration)
    if (paid.length !== 1) return skip("unexpected_lines")
    priceId = linePrice(paid[0])
    periodStart = paid[0].period?.start
    periodEnd = paid[0].period?.end
  }

  // A paid subscription Price that maps to no plan is a configuration error: keep it visible and retryable.
  const price = getStripePriceInfo(priceId)
  if (!price) throw new Error("subscription_price_unknown")

  // The billed period comes from Stripe. An eligible invoice without one fails, so Stripe retries.
  if (!Number.isSafeInteger(periodStart) || !Number.isSafeInteger(periodEnd) ||
      (periodEnd as number) <= (periodStart as number) || (periodStart as number) <= 0) {
    throw new Error("invoice_period_invalid")
  }

  const { data: customer, error: customerError } = await admin
    .from("stripe_customers")
    .select("user_id, livemode")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (customerError) throw new Error("customer_read_failed")
  if (!customer) throw new Error("invoice_without_user")
  if (customer.livemode !== null && customer.livemode !== livemode) throw new Error("customer_mode_mismatch")

  const { data: result, error } = price.interval === "annual"
    ? await admin.rpc("deliver_annual_subscription_credits", { p_subscription_id: subscriptionId, p_livemode: livemode })
    : await admin.rpc("grant_subscription_credits_v3", {
        p_invoice_id: invoice.id,
        p_user_id: customer.user_id,
        p_subscription_id: subscriptionId,
        p_plan: price.plan,
        p_livemode: livemode,
        p_period_start: new Date((periodStart as number) * 1000).toISOString(),
        p_period_end: new Date((periodEnd as number) * 1000).toISOString(),
      })

  if (error) throw new Error(`credit_grant_failed: ${error.message.slice(0, 120)}`)
  // A paid annual invoice for a subscription without a running term must be looked at, not dropped.
  if (result === "inactive") throw new Error("annual_subscription_inactive")
  // stale: the period already ended or a newer one was granted; nothing to add.
  if (!["applied", "upgraded", "simulated", "duplicate", "stale"].includes(result as string)) {
    throw new Error(`credit_grant_unexpected: ${String(result).slice(0, 40)}`)
  }
}

/*
 * Records a paid credit pack. Always re-reads the Checkout Session, its line
 * items and its PaymentIntent from Stripe, so the event body is never trusted
 * and completed / async_payment_succeeded can arrive in any order: whichever
 * sees the payment confirmed records it, and the PaymentIntent ID keeps it to
 * one lot.
 *
 * Payments that are not PixelFM packs are skipped. A recognized pack that is
 * really paid but fails a check (price, amount, currency, lines, owner) is
 * never recorded and never closed as processed: it throws a
 * "pack_verification_failed: <reason>" error, so the event stays failed and
 * can be retried or replayed once the cause is fixed.
 */
async function recordPackPurchase(admin: Admin, sessionId: string, livemode: boolean) {
  const liveKey = (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")
  if (liveKey !== livemode) throw new Error("livemode_mismatch")

  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent.latest_charge"],
  })
  const skip = (reason: string) => console.warn("Stripe pack payment not recorded:", reason)
  const fail = (reason: string): never => { throw new Error(`pack_verification_failed: ${reason}`) }

  if (session.livemode !== livemode) throw new Error("livemode_mismatch")
  if (session.mode !== "payment") return skip("not_payment_mode")

  // A PixelFM pack is recognized by a pack Price or by the metadata our Checkout sets.
  const items = session.line_items
  const item = items && !items.has_more && items.data.length === 1 ? items.data[0] : null
  const pricePack = getStripePackByPrice(item?.price?.id)
  const metadataPack = session.metadata?.kind === "credit_pack" ? session.metadata.pack ?? "" : null
  if (!pricePack && metadataPack === null) return skip("not_a_pack")

  // Not paid yet (e.g. bank debits): checkout.session.async_payment_succeeded records it later.
  if (session.status !== "complete" || session.payment_status !== "paid") return skip("payment_pending")

  // From here the pack is paid: any mismatch must stay visible, never be dropped.
  if (!item) return fail("unexpected_lines")
  if (!pricePack) return fail("unknown_price")
  const pack = pricePack
  if (metadataPack !== null && metadataPack !== pack) return fail("pack_mismatch")
  if (item.quantity !== 1) return fail("unexpected_quantity")

  // Only fields Stripe documents in the integration currency (USD) are compared,
  // so a customer paying in local currency (Adaptive Pricing) is still verified:
  // session totals and the line's own Price, never the line's presented amounts.
  const expected = getPackAmountCents(pack)
  if (
    session.currency !== PACK_CURRENCY || session.amount_total !== expected ||
    item.price?.currency !== PACK_CURRENCY || item.price?.unit_amount !== expected
  ) {
    return fail("unexpected_amount")
  }

  const paymentIntent = session.payment_intent
  if (!paymentIntent || typeof paymentIntent === "string") throw new Error("payment_intent_missing")
  // The session says paid; a PaymentIntent that disagrees is retried, never dropped.
  if (paymentIntent.status !== "succeeded") throw new Error("payment_intent_not_succeeded")
  // amount (integration currency) of a succeeded PaymentIntent; amount_received may be in local currency.
  if (
    paymentIntent.livemode !== livemode || paymentIntent.currency !== PACK_CURRENCY ||
    paymentIntent.amount !== expected
  ) {
    return fail("unexpected_payment_intent")
  }

  // The owner is the user behind the paying Stripe customer, and must match the session.
  const customerId = idOf(session.customer)
  if (!customerId) return fail("no_customer")
  const { data: customer, error: customerError } = await admin
    .from("stripe_customers")
    .select("user_id, livemode")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (customerError) throw new Error("customer_read_failed")
  if (!customer) throw new Error("pack_without_user")
  if (customer.livemode !== null && customer.livemode !== livemode) return fail("customer_mode_mismatch")
  const metadataUser = session.metadata?.supabase_user_id
  if (session.client_reference_id !== customer.user_id || (metadataUser && metadataUser !== customer.user_id)) {
    return fail("owner_mismatch")
  }

  const charge = paymentIntent.latest_charge
  const paidAt = charge && typeof charge !== "string" ? charge.created : paymentIntent.created

  // Migration 013: TEST records a 'simulated' lot; LIVE an 'applied' lot added to the balance.
  const { data: result, error } = await admin.rpc("record_credit_pack_purchase_v2", {
    p_payment_intent_id: paymentIntent.id,
    p_user_id: customer.user_id,
    p_pack: pack,
    p_livemode: livemode,
    p_purchased_at: new Date(paidAt * 1000).toISOString(),
  })

  if (error) throw new Error(`pack_record_failed: ${error.message.slice(0, 120)}`)
  // A LIVE payment must never end up simulated, nor a TEST one applied.
  if (result !== "duplicate" && result !== (livemode ? "applied" : "simulated")) {
    throw new Error(`pack_record_unexpected: ${String(result).slice(0, 40)}`)
  }
}

/** Returns false when the event carries nothing this layer tracks. */
async function handleEvent(admin: Admin, event: Stripe.Event): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.async_payment_succeeded":
      if (event.data.object.mode !== "payment") return false
      await recordPackPurchase(admin, event.data.object.id, event.livemode)
      return true
    case "checkout.session.completed": {
      if (event.data.object.mode === "payment") {
        await recordPackPurchase(admin, event.data.object.id, event.livemode)
        return true
      }
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
      const subscription = await syncSubscription(admin, subscriptionId)
      if (event.type === "invoice.paid" && event.data.object.id) {
        await grantInvoiceCredits(admin, event.data.object.id, event.livemode, subscription)
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
