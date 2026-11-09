import "server-only"

import { CREDIT_PACKS, type CreditPack, type CreditPackId } from "@/lib/pricing-plans"

/*
 * Server-side mapping of the credit packs to their Stripe Prices. The browser
 * only names a pack; the Price charged, its amount and its credits are always
 * resolved here, and a webhook only accepts a payment whose Price maps back to
 * a pack with the expected amount.
 */

export type StripePack = CreditPackId

export const PACK_CURRENCY = "usd"

const STRIPE_PACKS: StripePack[] = CREDIT_PACKS.map((pack) => pack.id)

const priceIds = (): Record<StripePack, string> => ({
  small: process.env.STRIPE_PRICE_PACK_SMALL?.trim() ?? "",
  medium: process.env.STRIPE_PRICE_PACK_MEDIUM?.trim() ?? "",
  large: process.env.STRIPE_PRICE_PACK_LARGE?.trim() ?? "",
})

export function isStripePack(value: unknown): value is StripePack {
  return STRIPE_PACKS.includes(value as StripePack)
}

/** Only a configured price_ ID counts; anything else means the pack is not on sale. */
export function getStripePackPriceId(pack: StripePack): string | null {
  const id = priceIds()[pack]
  return id.startsWith("price_") ? id : null
}

export function getStripePackByPrice(priceId: string | null | undefined): StripePack | null {
  if (!priceId) return null
  const prices = priceIds()
  return STRIPE_PACKS.find((pack) => prices[pack] === priceId && priceId.startsWith("price_")) ?? null
}

export function getPackDetails(pack: StripePack): CreditPack {
  return CREDIT_PACKS.find((item) => item.id === pack)!
}

/** Expected charge in cents, from the single commercial catalog. */
export function getPackAmountCents(pack: StripePack): number {
  return Math.round(getPackDetails(pack).price * 100)
}
