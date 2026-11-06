import "server-only"

export const STRIPE_PLANS = ["starter", "pro", "business"] as const

export type StripePlan = (typeof STRIPE_PLANS)[number]

const priceIds = (): Record<StripePlan, string> => ({
  starter: process.env.STRIPE_PRICE_STARTER?.trim() ?? "",
  pro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
  business: process.env.STRIPE_PRICE_BUSINESS?.trim() ?? "",
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
