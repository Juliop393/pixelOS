import "server-only"

import Stripe from "stripe"

let client: Stripe | null = null

/** Built on first use, so a missing key fails the request and not the build. */
export function getStripe(): Stripe {
  if (client) return client

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) throw new Error("Falta STRIPE_SECRET_KEY en el entorno")

  client = new Stripe(secretKey, {
    appInfo: { name: "PixelFM" },
    maxNetworkRetries: 2,
  })

  return client
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) throw new Error("Falta STRIPE_WEBHOOK_SECRET en el entorno")
  return secret
}
