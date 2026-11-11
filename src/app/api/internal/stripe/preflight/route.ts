import { createHash, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { catalogSlots, checkSlot, slotPriceId } from "@/lib/stripe-catalog"
import { isAnnualDeliveryConfigured } from "@/lib/stripe-plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/*
 * Read-only launch check of the Stripe setup the server is running with. It
 * changes nothing in Stripe or the database, and returns no secret. Protected
 * by PIXELFM_CRON_SECRET: Authorization: Bearer <secret>.
 *
 *   - the 9 configured Prices against the catalog (see stripe-catalog.ts)
 *   - the webhook endpoint for this site and the events the webhook handles
 *   - a default, active Billing Portal configuration
 *   - which gates are set (mode, LIVE flag, webhook secret, annual job)
 */

// Every event type the webhook route handles (src/app/api/webhooks/stripe/route.ts).
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]

const digest = (value: string) => createHash("sha256").update(value).digest()

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.PIXELFM_CRON_SECRET?.trim() ?? ""
  const header = req.headers.get("authorization") ?? ""
  return secret.length >= 32 && timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
}

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

const stripeError = (error: unknown) => (error as { code?: string; type?: string })?.code ?? (error as { type?: string })?.type ?? "unexpected"

async function checkWebhook(siteUrl: string) {
  const url = `${siteUrl}/api/webhooks/stripe`
  try {
    const endpoints = await getStripe().webhookEndpoints.list({ limit: 100 })
    const matching = endpoints.data.filter((endpoint) => endpoint.url.replace(/\/+$/, "") === url)
    const enabled = matching.filter((endpoint) => endpoint.status === "enabled")
    const events = new Set(enabled.flatMap((endpoint) => endpoint.enabled_events))
    const missingEvents = events.has("*") ? [] : WEBHOOK_EVENTS.filter((type) => !events.has(type))
    return { url, endpoints: matching.length, enabled: enabled.length, missingEvents, ok: enabled.length === 1 && missingEvents.length === 0 }
  } catch (error) {
    return { url, ok: false, error: stripeError(error) }
  }
}

async function checkPortal() {
  try {
    const configs = await getStripe().billingPortal.configurations.list({ is_default: true, active: true, limit: 1 })
    const config = configs.data[0]
    if (!config) return { ok: false, error: "no_default_configuration" }
    const features = config.features
    return {
      ok: true,
      cancel: features.subscription_cancel.enabled,
      switchPlans: features.subscription_update.enabled,
      paymentMethods: features.payment_method_update.enabled,
      invoices: features.invoice_history.enabled,
    }
  } catch (error) {
    return { ok: false, error: stripeError(error) }
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return json({ error: "No autorizado" }, 401)

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
  const mode = secretKey.startsWith("sk_live_") ? "live" : secretKey.startsWith("sk_test_") ? "test" : "none"
  if (mode === "none") return json({ mode, ok: false, error: "stripe_key_missing_or_unknown" })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? ""

  const slots = catalogSlots()
  const ids = slots.map(slotPriceId)
  const prices = await Promise.all(slots.map(async (slot, index) => {
    const priceId = ids[index]
    if (!priceId) return { env: slot.env, priceId: null, ok: false, problems: ["not_configured"] }
    const problems = await checkSlot(slot, priceId)
    // One Price in two slots would make the webhook unable to tell which plan was paid.
    if (ids.filter((id) => id === priceId).length > 1) problems.push("duplicated_in_other_slot")
    return { env: slot.env, priceId, ok: problems.length === 0, problems }
  }))

  const [webhook, portal] = await Promise.all([checkWebhook(siteUrl), checkPortal()])

  const gates = {
    liveCheckoutFlag: process.env.STRIPE_LIVE_CHECKOUT_ENABLED?.trim() === "true",
    webhookSecretSet: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    annualDeliveryConfigured: isAnnualDeliveryConfigured(),
    siteUrl: siteUrl || null,
  }

  const ok = prices.every((price) => price.ok) && webhook.ok && portal.ok &&
    gates.webhookSecretSet && gates.annualDeliveryConfigured && Boolean(siteUrl)

  return json({ mode, ok, gates, prices, webhook, portal })
}
