import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, getSiteUrl, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { getStripePriceId, isStripePlan } from "@/lib/stripe-plans"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

const LIVE_STATUSES = ["trialing", "active", "past_due", "unpaid", "paused"]
const DOUBLE_SUBMIT_WINDOW_MS = 60_000

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

    const admin = createAdminClient()
    const [{ data: stripeSubscription, error: stripeError }, { data: credits, error: creditsError }] = await Promise.all([
      admin
        .from("stripe_subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .in("status", LIVE_STATUSES)
        .limit(1)
        .maybeSingle(),
      // Read only: a live Paddle plan must not end up billed twice.
      admin
        .from("user_credits")
        .select("subscription_status, paddle_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ])

    if (stripeError || creditsError) throw new Error("subscription_read_failed")

    if (stripeSubscription) {
      return stripeJson({ error: "Ya tienes una suscripción activa", code: "subscription_exists" }, 409)
    }

    if (credits?.subscription_status === "active" && credits.paddle_subscription_id) {
      return stripeJson({ error: "Ya tienes una suscripción activa", code: "legacy_subscription_exists" }, 409)
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
        success_url: `${siteUrl}/dashboard?checkout=success`,
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
