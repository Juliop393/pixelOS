import "server-only"

import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { getStripePriceId, getStripePriceInfo, type StripePlan, type StripePriceInfo } from "@/lib/stripe-plans"
import { checkSlot, planSlot } from "@/lib/stripe-catalog"
import { getModeCustomer, getModeSubscriptions } from "@/lib/stripe-modes"
import { idOf } from "@/lib/stripe-subscriptions"
import { createAdminClient } from "@/lib/supabase-admin"

/*
 * Scheduled downgrades with Stripe Subscription Schedules. The plan the user
 * paid for stays until the current period ends; the next phase bills the lower
 * Price from then on. Nothing is charged, refunded or credited when the change
 * is scheduled: the renewal invoice of the new Price goes through invoice.paid
 * as usual and migration 014 grants that plan for that period.
 *
 * Only downgrades within the same billing interval. The subscription, its Price
 * and its period always come from Stripe, never from the browser.
 *
 * While a schedule is attached the Customer Portal can neither update nor
 * cancel the subscription, so a pending change can always be withdrawn here
 * (release): the subscription keeps its current Price and the Portal works again.
 */

type Admin = ReturnType<typeof createAdminClient>

export const PLAN_RANK: Record<StripePlan, number> = { starter: 0, growth: 1, pro: 2 }
const SCHEDULE_KIND = "pixelfm_downgrade"

export class PlanChangeError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message)
  }
}

const fail = (code: string, status: number, message: string): never => {
  throw new PlanChangeError(code, status, message)
}

export interface PendingChange {
  plan: StripePlan | null
  effectiveAt: string | null
  managed: boolean
}

export interface PendingPayment {
  plan: StripePlan | null
  invoiceUrl: string | null
  expiresAt: string | null
}

export interface PlanChangeState {
  subscription: {
    plan: StripePlan
    interval: StripePriceInfo["interval"]
    status: string
    periodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
  pending: PendingChange | null
  downgrades: StripePlan[]
  /** Higher plans the user can move to right now (monthly only, see stripe-plan-upgrade). */
  upgrades: StripePlan[]
  /** An upgrade waiting for its payment (e.g. card authentication). */
  pendingPayment: PendingPayment | null
  /** True once the credits of the current period and plan are recorded. */
  creditsReady: boolean
}

const iso = (seconds: number | null | undefined) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null

export interface Current {
  subscription: Stripe.Subscription
  item: Stripe.SubscriptionItem
  price: StripePriceInfo
}

/*
 * The user's subscription in the active mode, re-read from Stripe. Ownership:
 * the row is the user's in our mirror AND its Stripe customer is the user's
 * customer in this mode. The browser never names a subscription.
 */
export async function loadCurrent(admin: Admin, userId: string): Promise<Current | null> {
  const rows = (await getModeSubscriptions(admin, userId))
    .filter((row) => !["canceled", "incomplete_expired"].includes(row.status))
  if (rows.length === 0) return null
  if (rows.length > 1) fail("multiple_subscriptions", 409, "Tu cuenta tiene más de una suscripción. Contacta con soporte.")

  const customer = await getModeCustomer(admin, userId)
  const subscription = await getStripe().subscriptions.retrieve(rows[0].stripe_subscription_id)
  if (!customer || idOf(subscription.customer) !== customer || rows[0].stripe_customer_id !== customer) {
    fail("not_owner", 403, "Suscripción no autorizada")
  }
  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") return null

  const item = subscription.items.data[0]
  const price = getStripePriceInfo(item?.price.id)
  if (subscription.items.data.length !== 1 || item.quantity !== 1 || !price) {
    fail("unsupported_subscription", 409, "Esta suscripción no admite cambios de plan automáticos. Contacta con soporte.")
  }
  return { subscription, item, price: price as StripePriceInfo }
}

export async function loadSchedule(subscription: Stripe.Subscription): Promise<Stripe.SubscriptionSchedule | null> {
  const id = idOf(subscription.schedule)
  if (!id) return null
  const schedule = await getStripe().subscriptionSchedules.retrieve(id)
  return ["not_started", "active"].includes(schedule.status) ? schedule : null
}

/** The scheduled phase after the current one, if the schedule changes the Price. */
function describePending(schedule: Stripe.SubscriptionSchedule | null, current: Current): PendingChange | null {
  if (!schedule) return null
  const managed = schedule.metadata?.kind === SCHEDULE_KIND
  const now = Math.floor(Date.now() / 1000)
  const next = schedule.phases.find((phase) => phase.start_date > now)
  const nextPrice = next ? idOf(next.items[0]?.price) : null
  if (!next || nextPrice === current.item.price.id) {
    // A schedule we created whose change already happened is finished business.
    return managed ? null : { plan: null, effectiveAt: null, managed }
  }
  return { plan: getStripePriceInfo(nextPrice)?.plan ?? null, effectiveAt: iso(next.start_date), managed }
}

export async function getPlanChangeState(userId: string): Promise<PlanChangeState> {
  const admin = createAdminClient()
  const current = await loadCurrent(admin, userId)
  if (!current) return { subscription: null, pending: null, downgrades: [], upgrades: [], pendingPayment: null, creditsReady: false }

  const { subscription, item, price } = current
  const schedule = await loadSchedule(subscription)
  const pending = describePending(schedule, current)
  const pendingPayment = await describePendingPayment(subscription)
  const canChange = subscription.status === "active" && !subscription.cancel_at_period_end && !subscription.cancel_at && !pendingPayment
  const available = (higher: boolean) => canChange
    ? (Object.keys(PLAN_RANK) as StripePlan[]).filter((plan) =>
        (higher ? PLAN_RANK[plan] > PLAN_RANK[price.plan] : PLAN_RANK[plan] < PLAN_RANK[price.plan]) && getStripePriceId(plan, price.interval))
    : []
  const downgrades = available(false)
  // Upgrades start a new monthly period now; annual terms and pending changes are excluded.
  const upgrades = price.interval === "monthly" && !schedule ? available(true) : []

  const { data: grant, error: grantError } = await admin
    .from("credit_period_grants")
    .select("plan")
    .eq("stripe_subscription_id", subscription.id)
    .eq("period_start", iso(item.current_period_start))
    .maybeSingle()
  if (grantError) throw new Error("grant_read_failed")

  return {
    subscription: {
      plan: price.plan,
      interval: price.interval,
      status: subscription.status,
      periodEnd: iso(item.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    },
    pending,
    downgrades,
    upgrades,
    pendingPayment,
    creditsReady: grant?.plan === price.plan,
  }
}

/** An upgrade Stripe holds until its invoice is paid (pending_if_incomplete). */
async function describePendingPayment(subscription: Stripe.Subscription): Promise<PendingPayment | null> {
  const pendingUpdate = subscription.pending_update
  if (!pendingUpdate) return null
  const invoiceId = idOf(subscription.latest_invoice)
  const invoice = invoiceId ? await getStripe().invoices.retrieve(invoiceId) : null
  return {
    plan: getStripePriceInfo(idOf(pendingUpdate.subscription_items?.[0]?.price))?.plan ?? null,
    invoiceUrl: invoice?.status === "open" ? invoice.hosted_invoice_url ?? null : null,
    expiresAt: iso(pendingUpdate.expires_at),
  }
}

const isScheduleConflict = (error: unknown) => {
  const e = error as { type?: string; statusCode?: number; message?: string } | null
  return e?.statusCode === 400 && /schedule/i.test(e?.message ?? "")
}

/*
 * Schedules current plan -> target at the end of the paid period. Safe to repeat:
 * the same target returns the existing change, a different lower target rewrites
 * the next phase. Concurrent first requests resolve to one schedule (Stripe allows
 * one per subscription; the create is idempotent per minute and a lost race reuses
 * the winner's schedule).
 */
export async function scheduleDowngrade(userId: string, target: StripePlan): Promise<PlanChangeState> {
  const admin = createAdminClient()
  const current = await loadCurrent(admin, userId)
  if (!current) return fail("no_subscription", 404, "No tienes una suscripción activa")

  const { subscription, item, price } = current
  if (subscription.status !== "active") fail("not_active", 409, "Tu suscripción no está activa")
  if (subscription.cancel_at_period_end || subscription.cancel_at) {
    fail("canceling", 409, "Tu suscripción ya está programada para cancelarse")
  }
  if (subscription.pending_update) fail("payment_pending", 409, "Tienes una mejora de plan pendiente de pago. Complétala o anúlala primero.")
  if (PLAN_RANK[target] >= PLAN_RANK[price.plan]) fail("not_a_downgrade", 400, "Solo puedes bajar a un plan inferior")

  const targetPrice = getStripePriceId(target, price.interval)
  if (!targetPrice) return fail("plan_unavailable", 503, "Este plan todavía no está disponible")
  const problems = await checkSlot(planSlot(target, price.interval), targetPrice)
  if (problems.length > 0) {
    console.error("Stripe downgrade price rejected:", target, price.interval, problems.join(","))
    fail("plan_unavailable", 503, "Este plan todavía no está disponible")
  }

  const periodStart = item.current_period_start
  const periodEnd = item.current_period_end
  if (!(periodEnd > Math.floor(Date.now() / 1000))) fail("period_ended", 409, "Tu período actual ya terminó. Inténtalo en unos minutos.")

  const stripe = getStripe()
  let schedule = await loadSchedule(subscription)
  if (schedule && schedule.metadata?.kind !== SCHEDULE_KIND) {
    fail("other_schedule", 409, "Ya hay otro cambio programado en tu suscripción. Anúlalo antes de solicitar uno nuevo.")
  }

  if (!schedule) {
    // No idempotency key: a replay could hand back a schedule already released by a
    // withdrawal. Stripe attaches one schedule per subscription, so a concurrent
    // second create fails and that request continues with the winner's schedule.
    try {
      schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id })
    } catch (error) {
      if (!isScheduleConflict(error)) throw error
      schedule = await loadSchedule(await stripe.subscriptions.retrieve(subscription.id))
      if (!schedule) throw error
    }
    // The subscription must point at this very schedule before its phases are written.
    const attached = idOf((await stripe.subscriptions.retrieve(subscription.id)).schedule)
    if (attached !== schedule.id || idOf(schedule.subscription) !== subscription.id || !["not_started", "active"].includes(schedule.status)) {
      fail("schedule_conflict", 409, "No se pudo programar el cambio. Inténtalo nuevamente.")
    }
  }

  const phase = schedule.phases.find((p) => p.start_date <= periodStart && p.end_date >= periodEnd) ?? schedule.phases[0]
  if (!phase || idOf(phase.items[0]?.price) !== item.price.id || phase.items.length !== 1 || phase.end_date !== periodEnd) {
    fail("schedule_unexpected", 409, "No se pudo programar el cambio. Inténtalo nuevamente.")
  }
  // Fields this flow does not carry over are refused rather than silently dropped by the update.
  if ((phase.discounts?.length ?? 0) > 0 || (phase.default_tax_rates?.length ?? 0) > 0 ||
      (phase.add_invoice_items?.length ?? 0) > 0 || (phase.items[0].tax_rates?.length ?? 0) > 0 ||
      (phase.trial_end && phase.trial_end > Math.floor(Date.now() / 1000))) {
    fail("unsupported_subscription", 409, "Esta suscripción no admite cambios de plan automáticos. Contacta con soporte.")
  }

  const metadata = { ...subscription.metadata, plan: target }
  const updated = await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    proration_behavior: "none",
    metadata: { kind: SCHEDULE_KIND, supabase_user_id: userId, from_plan: price.plan, target_plan: target },
    phases: [
      {
        items: [{ price: item.price.id, quantity: 1 }],
        start_date: phase.start_date,
        end_date: periodEnd,
        proration_behavior: "none",
        metadata: { ...subscription.metadata },
      },
      {
        items: [{ price: targetPrice, quantity: 1 }],
        duration: { interval: price.interval === "annual" ? "year" : "month", interval_count: 1 },
        proration_behavior: "none",
        metadata,
      },
    ],
  })

  const next = updated.phases.find((p) => p.start_date === periodEnd)
  if (!next || idOf(next.items[0]?.price) !== targetPrice) {
    throw new Error("downgrade_schedule_mismatch")
  }
  return getPlanChangeState(userId)
}

/*
 * Withdraws any pending change on the user's subscription by releasing its schedule.
 * The subscription keeps its current Price and period, and the Portal can cancel it again.
 */
export async function cancelPendingChange(userId: string): Promise<PlanChangeState> {
  const admin = createAdminClient()
  const current = await loadCurrent(admin, userId)
  if (!current) return fail("no_subscription", 404, "No tienes una suscripción activa")

  // An upgrade waiting for payment is withdrawn by voiding its invoice (Stripe then drops the pending update).
  if (current.subscription.pending_update) {
    const invoiceId = idOf(current.subscription.latest_invoice)
    const invoice = invoiceId ? await getStripe().invoices.retrieve(invoiceId) : null
    if (invoice?.status === "open") await getStripe().invoices.voidInvoice(invoice.id)
  }

  const schedule = await loadSchedule(current.subscription)
  if (schedule) {
    try {
      await getStripe().subscriptionSchedules.release(schedule.id, { preserve_cancel_date: true })
    } catch (error) {
      // Released by a concurrent request: the outcome is the same.
      const fresh = await getStripe().subscriptionSchedules.retrieve(schedule.id)
      if (fresh.status !== "released") throw error
    }
  }
  return getPlanChangeState(userId)
}
