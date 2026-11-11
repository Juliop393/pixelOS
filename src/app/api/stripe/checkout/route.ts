import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, getSiteUrl, isStripeCheckoutAllowed, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { isBillingInterval, isPlanCheckoutReady } from "@/lib/pricing-plans"
import { getStripePriceId, isAnnualDeliveryConfigured, isStripePlan } from "@/lib/stripe-plans"
import { activeLivemode, getModeCustomer, getModeSubscriptions } from "@/lib/stripe-modes"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

const LIVE_STATUSES = ["trialing", "active", "past_due", "unpaid", "paused"]
const DOUBLE_SUBMIT_WINDOW_MS = 60_000

/** The user's customer in the active Stripe mode, created on first Checkout of that mode. */
async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient()
  const existing = await getModeCustomer(admin, userId)
  if (existing) return existing

  // The key makes concurrent first checkouts resolve to one Stripe customer.
  const customer = await getStripe().customers.create(
    { email, metadata: { supabase_user_id: userId } },
    { idempotencyKey: `pixelfm-customer-${userId}` }
  )

  const { error: insertError } = await admin
    .from("stripe_customers")
    .insert({ user_id: userId, stripe_customer_id: customer.id, livemode: customer.livemode ?? activeLivemode() })

  if (insertError && insertError.code !== "23505") throw new Error("customer_write_failed")
  return customer.id
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return stripeJson({ error: "No autorizado" }, 401)

  if (!isStripeCheckoutAllowed(user.id)) {
    return stripeJson({ error: "El pago todavía no está disponible para esta cuenta" }, 403)
  }

  let plan: unknown
  let interval: unknown
  try {
    const body = await req.json()
    plan = body?.plan
    interval = body?.interval ?? "monthly"
  } catch {
    return stripeJson({ error: "Cuerpo de solicitud inválido" }, 400)
  }

  if (!isStripePlan(plan) || !isBillingInterval(interval)) return stripeJson({ error: "Plan inválido" }, 400)

  // Never charge a plan whose credits the webhook cannot grant yet, even if Stripe has a Price for it.
  if (!isPlanCheckoutReady(plan, interval)) {
    return stripeJson({ error: "Este plan todavía no está disponible", code: "plan_unavailable" }, 409)
  }

  // Annual credits arrive month by month: never sell a year while those deliveries cannot run.
  if (interval === "annual" && !isAnnualDeliveryConfigured()) {
    return stripeJson({ error: "Este plan todavía no está disponible", code: "plan_unavailable" }, 409)
  }

  const priceId = getStripePriceId(plan, interval)
  if (!priceId) return stripeJson({ error: "Plan no disponible" }, 503)

  try {
    if (!(await isWithinBillingLimit(user.id, "stripe-checkout"))) {
      return stripeJson({ error: "Demasiados intentos. Espera un momento." }, 429)
    }

    // Stripe is the only billing processor: one subscription per user in the active mode.
    const subscriptions = await getModeSubscriptions(createAdminClient(), user.id)

    if (subscriptions.some((row) => LIVE_STATUSES.includes(row.status))) {
      return stripeJson({ error: "Ya tienes una suscripción activa", code: "subscription_exists" }, 409)
    }

    const customer = await getOrCreateCustomer(user.id, user.email)
    const siteUrl = getSiteUrl()
    const metadata = { supabase_user_id: user.id, plan, interval }
    const attempt = Math.floor(Date.now() / DOUBLE_SUBMIT_WINDOW_MS)

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        subscription_data: { metadata },
        // Stripe fills {CHECKOUT_SESSION_ID}; the page verifies it server-side.
        success_url: `${siteUrl}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing?checkout=canceled`,
      },
      { idempotencyKey: `pixelfm-checkout-${user.id}-${priceId}-${attempt}` }
    )

    if (!session.url) throw new Error("checkout_url_missing")
    return stripeJson({ url: session.url })
  } catch (error) {
    console.error("Stripe checkout failed:", error instanceof Error ? error.message : "unexpected")
    return stripeJson({ error: "No se pudo iniciar el pago" }, 502)
  }
}
