import "server-only"

import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLANS } from "@/lib/pricing-plans"
import { getStripePriceId, type StripePlan } from "@/lib/stripe-plans"
import { checkSlot, planSlot } from "@/lib/stripe-catalog"
import { idOf } from "@/lib/stripe-subscriptions"
import { createAdminClient } from "@/lib/supabase-admin"
import {
  getPlanChangeState,
  loadCurrent,
  loadSchedule,
  PLAN_RANK,
  PlanChangeError,
  type Current,
  type PlanChangeState,
} from "@/lib/stripe-plan-change"

/*
 * Immediate upgrades (Starter -> Growth / Pro, Growth -> Pro), monthly only.
 *
 * Economic rule: an upgrade starts a NEW monthly period now. Stripe charges the
 * full price of the new plan for that period (billing_cycle_anchor=now,
 * proration_behavior=none) and the webhook grants the new plan's credits for it
 * through invoice.paid (grant_subscription_upgrade_credits, migration 016):
 *   - the credits still unused in the replaced period (its monthly credits and any
 *     valid rollover) are kept, with their original expiry, and spent first;
 *   - pack and legacy credits are never touched;
 *   - ordinary renewals keep the 014 rollover caps (Starter carries nothing).
 * The engine's same-period top-up ("upgraded", the full difference for any
 * prorated amount) is never reached: the period always changes.
 *
 * Payment first: payment_behavior=pending_if_incomplete keeps the old plan until
 * the invoice is paid. A declined card voids the invoice at once (the update is
 * discarded); a card that needs authentication is paid on Stripe's hosted invoice
 * page and Stripe applies the upgrade then. Credits only ever come from invoice.paid.
 */

const PRICE_CENTS: Record<StripePlan, number> = Object.fromEntries(
  SUBSCRIPTION_PLANS.map((plan) => [plan.id, Math.round(plan.monthlyPrice * 100)])
) as Record<StripePlan, number>
const PLAN_CREDITS: Record<StripePlan, number> = Object.fromEntries(
  SUBSCRIPTION_PLANS.map((plan) => [plan.id, plan.monthlyCredits])
) as Record<StripePlan, number>

const fail = (code: string, status: number, message: string): never => {
  throw new PlanChangeError(code, status, message)
}

export interface UpgradeQuote {
  plan: StripePlan
  amountDue: number
  currency: string
  credits: number
  periodStart: string
  nextRenewal: string
  /** Live balance details when the engine tracks this period; null otherwise (e.g. TEST). */
  /** Credits of the current period kept after the upgrade, as the engine holds them now (LIVE). */
  kept: { credits: number; expiresAt: string } | null
}

export type UpgradeResult =
  | { result: "paid"; state: PlanChangeState }
  | { result: "requires_action"; invoiceUrl: string; state: PlanChangeState }
  | { result: "declined"; state: PlanChangeState }

const iso = (seconds: number) => new Date(seconds * 1000).toISOString()

/** Every check an upgrade needs, from Stripe's current state. Returns the target Price. */
async function validate(current: Current | null, target: StripePlan): Promise<{ current: Current; targetPrice: string }> {
  if (!current) return fail("no_subscription", 404, "No tienes una suscripción activa")
  const { subscription, price } = current
  if (subscription.status !== "active") fail("not_active", 409, "Tu suscripción no está activa. Revisa tu método de pago en el portal.")
  if (subscription.cancel_at_period_end || subscription.cancel_at) {
    fail("canceling", 409, "Tu suscripción está programada para cancelarse. Reactívala en el portal antes de mejorar.")
  }
  if (PLAN_RANK[target] <= PLAN_RANK[price.plan]) fail("not_an_upgrade", 400, "Solo puedes mejorar a un plan superior")
  if (price.interval !== "monthly") fail("annual_unsupported", 409, "La mejora de planes anuales todavía no está disponible.")
  if (await loadSchedule(subscription)) {
    fail("pending_change", 409, "Tienes un cambio de plan programado. Anúlalo antes de mejorar tu plan.")
  }

  const targetPrice = getStripePriceId(target, price.interval)
  if (!targetPrice) return fail("plan_unavailable", 503, "Este plan todavía no está disponible")
  const problems = await checkSlot(planSlot(target, price.interval), targetPrice)
  if (problems.length > 0) {
    console.error("Stripe upgrade price rejected:", target, price.interval, problems.join(","))
    fail("plan_unavailable", 503, "Este plan todavía no está disponible")
  }
  return { current: current as Current, targetPrice }
}

/*
 * What migration 016 will keep: this period's unused monthly credits plus valid
 * rollover, expiring when this period would. Null when the engine does not hold
 * this period (TEST, or not granted yet): nothing is promised then.
 */
async function keptCredits(userId: string, current: Current): Promise<UpgradeQuote["kept"]> {
  const { data, error } = await createAdminClient()
    .from("credit_accounts")
    .select("monthly_credits, rollover_credits, rollover_expires_at, monthly_period_key, monthly_expires_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw new Error("credit_read_failed")
  const key = `period:${current.subscription.id}:${current.item.current_period_start}`
  if (!data || data.monthly_period_key !== key || new Date(data.monthly_expires_at) <= new Date()) return null
  const rollover = data.rollover_expires_at && new Date(data.rollover_expires_at) > new Date() ? (data.rollover_credits as number) : 0
  return { credits: (data.monthly_credits as number) + rollover, expiresAt: new Date(data.monthly_expires_at).toISOString() }
}

export async function previewUpgrade(userId: string, target: StripePlan): Promise<UpgradeQuote> {
  const current = await loadCurrent(createAdminClient(), userId)
  if (current?.subscription.pending_update) fail("payment_pending", 409, "Ya tienes una mejora pendiente de pago.")
  const { current: ok, targetPrice } = await validate(current, target)

  const preview = await getStripe().invoices.createPreview({
    customer: idOf(ok.subscription.customer) as string,
    subscription: ok.subscription.id,
    subscription_details: {
      items: [{ id: ok.item.id, price: targetPrice }],
      billing_cycle_anchor: { type: "now" },
      proration_behavior: "none",
    },
  })
  const line = preview.lines.data.find((l) => l.pricing?.price_details?.price === targetPrice)
  // The rule is a full-price new period: anything else means Stripe would bill differently.
  if (!line || preview.lines.data.length !== 1 || preview.total !== PRICE_CENTS[target] || !line.period) {
    console.error("Stripe upgrade preview unexpected:", preview.lines.data.length, preview.total)
    fail("preview_unexpected", 502, "No se pudo calcular el cambio de plan. Inténtalo nuevamente.")
  }

  return {
    plan: target,
    amountDue: preview.amount_due,
    currency: preview.currency,
    credits: PLAN_CREDITS[target],
    periodStart: iso(line!.period.start),
    nextRenewal: iso(line!.period.end),
    kept: await keptCredits(userId, ok),
  }
}

/** Status of the PaymentIntent behind an invoice, if any. */
async function paymentStatus(invoiceId: string): Promise<Stripe.PaymentIntent.Status | null> {
  const stripe = getStripe()
  const payments = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 10 })
  const intent = payments.data.map((p) => idOf(p.payment.payment_intent ?? null)).find(Boolean)
  return intent ? (await stripe.paymentIntents.retrieve(intent)).status : null
}

export async function upgradeSubscription(userId: string, target: StripePlan): Promise<UpgradeResult> {
  const admin = createAdminClient()
  const stripe = getStripe()
  const current = await loadCurrent(admin, userId)

  // Already waiting for this payment (double click, page reload, 3DS in progress): never charge twice.
  if (current?.subscription.pending_update) {
    const state = await getPlanChangeState(userId)
    if (state.pendingPayment?.plan === target && state.pendingPayment.invoiceUrl) {
      return { result: "requires_action", invoiceUrl: state.pendingPayment.invoiceUrl, state }
    }
    fail("payment_pending", 409, "Ya tienes una mejora pendiente de pago. Complétala o anúlala primero.")
  }
  const { current: ok, targetPrice } = await validate(current, target)
  const { subscription, item } = ok

  // One attempt per (subscription, target, last invoice): concurrent or repeated requests
  // replay the same Stripe response; after a voided attempt the last invoice changes,
  // and after a success the plan is no longer lower, so neither can charge again.
  const updated = await stripe.subscriptions.update(
    subscription.id,
    {
      items: [{ id: item.id, price: targetPrice }],
      billing_cycle_anchor: { type: "now" },
      proration_behavior: "none",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    },
    { idempotencyKey: `pixelfm-upgrade-${subscription.id}-${target}-${idOf(subscription.latest_invoice) ?? "none"}` }
  ).catch((error: unknown): never => {
    // The same upgrade is already being charged by a concurrent request (double click, two tabs).
    if ((error as { code?: string } | null)?.code === "idempotency_key_in_use") {
      fail("upgrade_in_progress", 409, "Tu pago ya se está procesando. Espera unos segundos.")
    }
    throw error
  })

  const invoice = updated.latest_invoice as Stripe.Invoice | null
  if (!updated.pending_update && updated.items.data[0]?.price.id === targetPrice) {
    if (invoice?.status !== "paid") console.error("Stripe upgrade applied without a paid invoice:", invoice?.status)
    return { result: "paid", state: await getPlanChangeState(userId) }
  }
  if (!invoice || invoice.status !== "open") throw new Error("upgrade_invoice_unexpected")

  const status = await paymentStatus(invoice.id)
  if ((status === "requires_action" || status === "requires_confirmation") && invoice.hosted_invoice_url) {
    return { result: "requires_action", invoiceUrl: invoice.hosted_invoice_url, state: await getPlanChangeState(userId) }
  }
  // Declined (or no usable payment method): drop the attempt so nothing stays pending or retried.
  await stripe.invoices.voidInvoice(invoice.id)
  return { result: "declined", state: await getPlanChangeState(userId) }
}
