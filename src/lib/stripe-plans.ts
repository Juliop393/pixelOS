import "server-only"

import { SUBSCRIPTION_PLANS, type BillingInterval, type PlanId } from "@/lib/pricing-plans"

/*
 * Server-side mapping of the plans to their Stripe Prices: one monthly and one
 * annual Price per plan, read from the environment. The browser only names a
 * plan and an interval; the Price charged, and which plan and interval a paid
 * Price means, are always resolved here. Only real Price IDs (price_...) count.
 */

export type StripePlan = PlanId

export interface StripePriceInfo {
  plan: StripePlan
  interval: BillingInterval
}

const STRIPE_PLANS: StripePlan[] = SUBSCRIPTION_PLANS.map((plan) => plan.id)
const INTERVALS: BillingInterval[] = ["monthly", "annual"]

const env = (name: string) => process.env[name]?.trim() ?? ""

const priceIds = (): Record<StripePlan, Record<BillingInterval, string>> => ({
  starter: { monthly: env("STRIPE_PRICE_STARTER"), annual: env("STRIPE_PRICE_STARTER_ANNUAL") },
  growth: { monthly: env("STRIPE_PRICE_GROWTH"), annual: env("STRIPE_PRICE_GROWTH_ANNUAL") },
  pro: { monthly: env("STRIPE_PRICE_PRO"), annual: env("STRIPE_PRICE_PRO_ANNUAL") },
})

export function isStripePlan(value: unknown): value is StripePlan {
  return STRIPE_PLANS.includes(value as StripePlan)
}

/** A configured price_ ID for that plan and interval, or null (not on sale). */
export function getStripePriceId(plan: StripePlan, interval: BillingInterval = "monthly"): string | null {
  const id = priceIds()[plan][interval]
  return id.startsWith("price_") ? id : null
}

/** Which plan and interval a Stripe Price means. A Price set in two slots is ambiguous and maps to nothing. */
export function getStripePriceInfo(priceId: string | null | undefined): StripePriceInfo | null {
  if (!priceId || !priceId.startsWith("price_")) return null
  const prices = priceIds()
  const matches = STRIPE_PLANS.flatMap((plan) =>
    INTERVALS.filter((interval) => prices[plan][interval] === priceId).map((interval) => ({ plan, interval }))
  )
  return matches.length === 1 ? matches[0] : null
}

export function getStripePlanByPrice(priceId: string | null | undefined): StripePlan | null {
  return getStripePriceInfo(priceId)?.plan ?? null
}

/*
 * Annual plans are only sold while the monthly deliveries can run: the internal
 * endpoint that n8n calls needs its secret (see /api/internal/stripe/annual-deliveries).
 */
export function isAnnualDeliveryConfigured(): boolean {
  return env("PIXELFM_CRON_SECRET").length >= 32
}
