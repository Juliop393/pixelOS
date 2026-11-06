import "server-only"

import { SUBSCRIPTION_PLANS, type PlanId } from "@/lib/pricing-plans"

export type StripePlan = PlanId

const STRIPE_PLANS: StripePlan[] = SUBSCRIPTION_PLANS.map((plan) => plan.id)

const priceIds = (): Record<StripePlan, string> => ({
  starter: process.env.STRIPE_PRICE_STARTER?.trim() ?? "",
  growth: process.env.STRIPE_PRICE_GROWTH?.trim() ?? "",
  pro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
})

export function isStripePlan(value: unknown): value is StripePlan {
  return STRIPE_PLANS.includes(value as StripePlan)
}

/** The browser only names a plan: the price charged is always resolved here. */
export function getStripePriceId(plan: StripePlan): string | null {
  return priceIds()[plan] || null
}

export function getStripePlanByPrice(priceId: string | null | undefined): StripePlan | null {
  if (!priceId) return null
  const prices = priceIds()
  return STRIPE_PLANS.find((plan) => prices[plan] === priceId) ?? null
}
