import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, getSiteUrl, isStripeTestCheckoutAllowed, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { getStripePackPriceId, isStripePack } from "@/lib/stripe-packs"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/*
 * One-time Checkout for the three credit packs (small, medium, large). The
 * browser only names the pack. Nothing here changes credits: the Stripe
 * webhook records the purchase once the payment is confirmed.
 */

// Packs are for subscribers with a subscription that is in good standing.
const ACTIVE_STATUSES = ["active", "trialing"]
const DOUBLE_SUBMIT_WINDOW_MS = 60_000

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return stripeJson({ error: "No autorizado" }, 401)

  // TEMPORARY: test accounts and test keys only, exactly like plan Checkout.
  if (!isStripeTestCheckoutAllowed(user.id)) {
    return stripeJson({ error: "La compra de créditos todavía no está disponible para esta cuenta" }, 403)
  }

  let pack: unknown
  try {
    pack = (await req.json())?.pack
  } catch {
    return stripeJson({ error: "Cuerpo de solicitud inválido" }, 400)
  }

  if (!isStripePack(pack)) return stripeJson({ error: "Pack inválido" }, 400)

  const priceId = getStripePackPriceId(pack)
  if (!priceId) return stripeJson({ error: "Pack no disponible" }, 503)

  try {
    if (!(await isWithinBillingLimit(user.id, "stripe-pack-checkout"))) {
      return stripeJson({ error: "Demasiados intentos. Espera un momento." }, 429)
    }

    const admin = createAdminClient()
    const [{ data: customer, error: customerError }, { data: subscriptions, error: subscriptionError }] = await Promise.all([
      admin.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
      admin
        .from("stripe_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .limit(5),
    ])

    if (customerError) throw new Error("customer_read_failed")
    if (subscriptionError) throw new Error("subscription_read_failed")

    // The pack is charged to the same Stripe customer that holds the active subscription.
    const customerId = customer?.stripe_customer_id as string | undefined
    const subscribed = Boolean(customerId) && (subscriptions ?? []).some((row) => row.stripe_customer_id === customerId)
    if (!subscribed || !customerId) {
      return stripeJson({ error: "Los packs de créditos son para suscriptores activos", code: "subscription_required" }, 403)
    }

    const siteUrl = getSiteUrl()
    const metadata = { supabase_user_id: user.id, pack, kind: "credit_pack" }
    const attempt = Math.floor(Date.now() / DOUBLE_SUBMIT_WINDOW_MS)

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        payment_intent_data: { metadata },
        // The return page only says the payment is being processed; the webhook decides.
        success_url: `${siteUrl}/dashboard/pricing?stripe_test=1&pack_checkout=processing#recargar`,
        cancel_url: `${siteUrl}/dashboard/pricing?stripe_test=1&pack_checkout=canceled#recargar`,
      },
      // Collapses double clicks inside one window; a later purchase gets a new session.
      { idempotencyKey: `pixelfm-pack-${user.id}-${priceId}-${attempt}` }
    )

    if (!session.url) throw new Error("checkout_url_missing")
    return stripeJson({ url: session.url })
  } catch (error) {
    console.error("Stripe pack checkout failed:", error instanceof Error ? error.message : "unexpected")
    return stripeJson({ error: "No se pudo iniciar el pago" }, 502)
  }
}
