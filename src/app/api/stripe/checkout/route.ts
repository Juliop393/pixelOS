import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, getSiteUrl, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { getStripePriceId, isStripePlan } from "@/lib/stripe-plans"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

const LIVE_STATUSES = ["trialing", "active", "past_due", "unpaid", "paused"]
const DOUBLE_SUBMIT_WINDOW_MS = 60_000

/*
 * TEMPORARY: while Stripe is validated in test mode, only one account may open
 * Checkout, and only with a test key. Remove this guard when plans go public.
 */
function isStripeTestCheckoutAllowed(userId: string): boolean {
  const allowedUserId = process.env.STRIPE_TEST_ALLOWED_USER_ID?.trim()
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
  return Boolean(allowedUserId) && userId === allowedUserId && secretKey.startsWith("sk_test_")
}

async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error("customer_read_failed")
  if (data) return data.stripe_customer_id

  // The key makes concurrent first checkouts resolve to one Stripe customer.
  const customer = await getStripe().customers.create(
    { email, metadata: { supabase_user_id: userId } },
    { idempotencyKey: `pixelfm-customer-${userId}` }
  )

  const { error: insertError } = await admin
    .from("stripe_customers")
    .insert({ user_id: userId, stripe_customer_id: customer.id })

  if (insertError && insertError.code !== "23505") throw new Error("customer_write_failed")
  return customer.id
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return stripeJson({ error: "No autorizado" }, 401)

  if (!isStripeTestCheckoutAllowed(user.id)) {
    return stripeJson({ error: "El pago todavía no está disponible para esta cuenta" }, 403)
  }

  let plan: unknown
  try {
    plan = (await req.json())?.plan
  } catch {
    return stripeJson({ error: "Cuerpo de solicitud inválido" }, 400)
  }

  if (!isStripePlan(plan)) return stripeJson({ error: "Plan inválido" }, 400)

  const priceId = getStripePriceId(plan)
  if (!priceId) return stripeJson({ error: "Plan no disponible" }, 503)

  try {
    if (!(await isWithinBillingLimit(user.id, "stripe-checkout"))) {
      return stripeJson({ error: "Demasiados intentos. Espera un momento." }, 429)
    }

    /*
     * TEMPORARY (test mode only): the legacy Paddle check on user_credits is
     * intentionally skipped here, because the guard above limits Checkout to
     * one account using an sk_test_ key, so no real charge can happen.
     * BEFORE ENABLING STRIPE LIVE: confirm there are no real Paddle
     * subscriptions left (or that they were migrated), and restore a
     * duplicate-billing check, or users could be charged by both processors.
     */
    const { data: stripeSubscription, error: stripeError } = await createAdminClient()
      .from("stripe_subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .in("status", LIVE_STATUSES)
      .limit(1)
      .maybeSingle()

    if (stripeError) throw new Error("subscription_read_failed")

    if (stripeSubscription) {
      return stripeJson({ error: "Ya tienes una suscripción activa", code: "subscription_exists" }, 409)
    }

    const customer = await getOrCreateCustomer(user.id, user.email)
    const siteUrl = getSiteUrl()
    const metadata = { supabase_user_id: user.id, plan }
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
