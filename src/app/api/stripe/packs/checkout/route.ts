import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, getSiteUrl, isStripeCheckoutAllowed, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { getStripePackPriceId, isStripePack } from "@/lib/stripe-packs"
import { checkSlot, packSlot } from "@/lib/stripe-catalog"
import { getModeCustomer, getModeSubscriptions } from "@/lib/stripe-modes"
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

  // Same access rule as plan Checkout (see isStripeCheckoutAllowed).
  if (!isStripeCheckoutAllowed(user.id)) {
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
    const customerId = await getModeCustomer(admin, user.id)
    const subscriptions = customerId ? await getModeSubscriptions(admin, user.id) : []

    // The pack is charged to the same Stripe customer, in the active mode, that holds the active subscription.
    const subscribed = Boolean(customerId) &&
      subscriptions.some((row) => row.stripe_customer_id === customerId && ACTIVE_STATUSES.includes(row.status))
    if (!subscribed || !customerId) {
      return stripeJson({ error: "Los packs de créditos son para suscriptores activos", code: "subscription_required" }, 403)
    }

    // The configured Price must be exactly what the catalog sells, or nothing is charged.
    const priceProblems = await checkSlot(packSlot(pack), priceId)
    if (priceProblems.length > 0) {
      console.error("Stripe pack price rejected:", pack, priceProblems.join(","))
      return stripeJson({ error: "Pack no disponible" }, 503)
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
        // Back to the dashboard, where the confirmation card verifies this session server-side;
        // the webhook alone records the pack.
        success_url: `${siteUrl}/dashboard?pack_checkout=processing&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/dashboard/pricing?pack_checkout=canceled#recargar`,
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
