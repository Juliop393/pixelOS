import "server-only"

import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { CREDIT_PACKS, SUBSCRIPTION_PLANS, type BillingInterval, type CreditPackId, type PlanId } from "@/lib/pricing-plans"
import { getStripePriceId } from "@/lib/stripe-plans"
import { getStripePackPriceId, PACK_CURRENCY } from "@/lib/stripe-packs"

/*
 * Checks that a configured Stripe Price really is what the commercial catalog
 * sells, read from Stripe with the server key: active Price and Product, USD,
 * the exact amount, monthly / yearly recurring for plans and one-time for packs,
 * and the same mode (TEST/LIVE) as the key. Checkout refuses a Price that fails,
 * so a mistyped env value can never charge one amount and grant another plan.
 */

export type CatalogSlot =
  | { kind: "plan"; env: string; plan: PlanId; interval: BillingInterval; cents: number }
  | { kind: "pack"; env: string; pack: CreditPackId; cents: number }

const PLAN_ENV: Record<PlanId, Record<BillingInterval, string>> = {
  starter: { monthly: "STRIPE_PRICE_STARTER", annual: "STRIPE_PRICE_STARTER_ANNUAL" },
  growth: { monthly: "STRIPE_PRICE_GROWTH", annual: "STRIPE_PRICE_GROWTH_ANNUAL" },
  pro: { monthly: "STRIPE_PRICE_PRO", annual: "STRIPE_PRICE_PRO_ANNUAL" },
}
const PACK_ENV: Record<CreditPackId, string> = {
  small: "STRIPE_PRICE_PACK_SMALL",
  medium: "STRIPE_PRICE_PACK_MEDIUM",
  large: "STRIPE_PRICE_PACK_LARGE",
}

const cents = (amount: number) => Math.round(amount * 100)

export function planSlot(plan: PlanId, interval: BillingInterval): CatalogSlot {
  const item = SUBSCRIPTION_PLANS.find((entry) => entry.id === plan)!
  return { kind: "plan", env: PLAN_ENV[plan][interval], plan, interval, cents: cents(interval === "annual" ? item.annualPrice : item.monthlyPrice) }
}

export function packSlot(pack: CreditPackId): CatalogSlot {
  const item = CREDIT_PACKS.find((entry) => entry.id === pack)!
  return { kind: "pack", env: PACK_ENV[pack], pack, cents: cents(item.price) }
}

export const catalogSlots = (): CatalogSlot[] => [
  ...SUBSCRIPTION_PLANS.flatMap((plan) => (["monthly", "annual"] as const).map((interval) => planSlot(plan.id, interval))),
  ...CREDIT_PACKS.map((pack) => packSlot(pack.id)),
]

export const slotPriceId = (slot: CatalogSlot) =>
  slot.kind === "plan" ? getStripePriceId(slot.plan, slot.interval) : getStripePackPriceId(slot.pack)

/** Problems found on a Price for that slot; an empty list means it matches. */
export function priceProblems(price: Stripe.Price, slot: CatalogSlot, liveKey: boolean): string[] {
  const problems: string[] = []
  const product = typeof price.product === "string" ? null : price.product

  if (price.livemode !== liveKey) problems.push("mode_mismatch")
  if (!price.active) problems.push("price_inactive")
  if (!product || ("deleted" in product && product.deleted) || !("active" in product) || !product.active) problems.push("product_inactive")
  if (price.currency !== PACK_CURRENCY) problems.push("currency_not_usd")
  if (price.billing_scheme !== "per_unit" || price.custom_unit_amount || price.transform_quantity) problems.push("unsupported_pricing")
  if (price.unit_amount !== slot.cents) problems.push("amount_mismatch")

  if (slot.kind === "plan") {
    const recurring = price.recurring
    const interval = slot.interval === "annual" ? "year" : "month"
    if (price.type !== "recurring" || !recurring) problems.push("not_recurring")
    else {
      if (recurring.interval !== interval || recurring.interval_count !== 1) problems.push("interval_mismatch")
      if (recurring.usage_type !== "licensed") problems.push("unsupported_usage")
      if (recurring.trial_period_days) problems.push("trial_not_expected")
    }
  } else if (price.type !== "one_time") {
    problems.push("not_one_time")
  }

  return problems
}

const liveKey = () => (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")

// Verified Prices are re-read at most every few minutes, so Checkout stays fast.
const VERIFIED_TTL_MS = 5 * 60 * 1000
const verified = new Map<string, number>()

/** Reads the Price from Stripe and returns its problems for that slot (empty = OK). */
export async function checkSlot(slot: CatalogSlot, priceId: string): Promise<string[]> {
  const live = liveKey()
  const cacheKey = `${live ? "live" : "test"}:${slot.env}:${priceId}`
  if ((verified.get(cacheKey) ?? 0) > Date.now()) return []

  let price: Stripe.Price
  try {
    price = await getStripe().prices.retrieve(priceId, { expand: ["product"] })
  } catch (error) {
    const code = (error as { code?: string })?.code
    return [code === "resource_missing" ? "price_not_found" : "price_read_failed"]
  }

  const problems = priceProblems(price, slot, live)
  if (problems.length === 0) verified.set(cacheKey, Date.now() + VERIFIED_TTL_MS)
  else verified.delete(cacheKey)
  return problems
}
