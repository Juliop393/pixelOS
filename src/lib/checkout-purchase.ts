/*
 * The amount a verified Checkout Session actually charged, for the advertising "Purchase"
 * conversion. Read-only and server-side: it only reads the Session Stripe returned, after the
 * verify routes confirmed ownership and a complete, paid status. Nothing here grants credits.
 *
 * Reported only for a Session created in the last 48 hours (a Session expires 24 hours after it
 * is created, so this covers any payment made in it), so reopening an old success URL never
 * counts as a new sale. USD only, the currency PixelFM sells in; anything else is not reported.
 */

const PURCHASE_WINDOW_S = 48 * 60 * 60

export type CheckoutPurchase = { value: number; currency: "USD" }

export function checkoutPurchase(session: {
  created: number
  amount_total: number | null
  currency: string | null
}): CheckoutPurchase | null {
  if (!Number.isFinite(session.created) || Date.now() / 1000 - session.created > PURCHASE_WINDOW_S) return null
  if (session.currency !== "usd") return null
  if (typeof session.amount_total !== "number" || !Number.isInteger(session.amount_total) || session.amount_total <= 0) return null
  return { value: session.amount_total / 100, currency: "USD" }
}
