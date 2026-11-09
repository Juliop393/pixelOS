import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, stripeJson } from "@/lib/stripe-api"
import { getStripePlanByPrice } from "@/lib/stripe-plans"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/*
 * Read-only confirmation for the post-Checkout page. It answers only for a
 * completed, paid subscription Checkout that belongs to the signed-in user,
 * with the plan taken from Stripe's own Price ID. It never changes credits,
 * subscriptions or invoices: that stays with the Stripe webhook.
 */

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,240}$/

const NOT_FOUND = { error: "No encontramos este pago", code: "not_found" }

type Activation = "preview" | "pending" | "active"

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null

/** Fails closed. Looser than Checkout's limit, since the page may re-check. */
async function isWithinVerifyLimit(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_and_record_api_rate_limit", {
    p_user_id: userId,
    p_endpoint: "stripe-checkout-verify",
    p_short_limit: 20,
    p_short_window_seconds: 60,
    p_daily_limit: 200,
  })

  if (error) throw new Error("rate_limit_failed")
  return data === "allowed"
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return stripeJson({ error: "No autorizado" }, 401)

  let sessionId: unknown
  try {
    sessionId = (await req.json())?.sessionId
  } catch {
    return stripeJson({ error: "Cuerpo de solicitud inválido" }, 400)
  }

  const match = typeof sessionId === "string" ? SESSION_ID.exec(sessionId) : null
  if (!match || typeof sessionId !== "string") return stripeJson({ error: "Identificador inválido", code: "invalid_id" }, 400)

  // The key decides which Stripe account answers: a session of the other mode cannot be ours.
  const liveKey = (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")
  if ((match[1] === "live") !== liveKey) return stripeJson(NOT_FOUND, 404)

  try {
    if (!(await isWithinVerifyLimit(user.id))) {
      return stripeJson({ error: "Demasiados intentos. Espera un momento." }, 429)
    }

    let session
    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["line_items"] })
    } catch (error) {
      const status = (error as { statusCode?: number } | null)?.statusCode
      if (status === 404) return stripeJson(NOT_FOUND, 404)
      throw new Error("stripe_unavailable")
    }

    // Ownership first, so nothing about another user's session is revealed.
    if (session.client_reference_id !== user.id || session.livemode !== liveKey) {
      return stripeJson(NOT_FOUND, 404)
    }

    const admin = createAdminClient()
    const { data: customer, error: customerError } = await admin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (customerError) throw new Error("customer_read_failed")
    if (!customer || customer.stripe_customer_id !== idOf(session.customer)) {
      return stripeJson(NOT_FOUND, 404)
    }

    if (session.mode !== "subscription" || session.status !== "complete" || session.payment_status !== "paid") {
      return stripeJson({ error: "El pago todavía no está confirmado", code: "incomplete" }, 409)
    }

    const items = session.line_items?.data ?? []
    const plan = items.length === 1 ? getStripePlanByPrice(items[0].price?.id) : null
    if (!plan) return stripeJson({ error: "Plan no reconocido", code: "unknown_plan" }, 409)

    let activation: Activation = "preview"
    if (session.livemode) {
      // LIVE benefits are confirmed only once the webhook applied credits for this
      // subscription (migration 014; an annual plan has no invoice per month) or,
      // for grants made before it, for this invoice (migration 012).
      const invoiceId = idOf(session.invoice)
      const subscriptionId = idOf(session.subscription)
      activation = "pending"
      if (subscriptionId) {
        const { data: periods, error: periodError } = await admin
          .from("credit_period_grants")
          .select("status")
          .eq("stripe_subscription_id", subscriptionId)
          .eq("user_id", user.id)
          .eq("status", "applied")
          .limit(1)

        if (periodError) throw new Error("grant_read_failed")
        if (periods && periods.length > 0) activation = "active"
      }
      if (activation === "pending" && invoiceId) {
        const { data: grant, error: grantError } = await admin
          .from("stripe_credit_grants")
          .select("status")
          .eq("stripe_invoice_id", invoiceId)
          .eq("user_id", user.id)
          .maybeSingle()

        if (grantError) throw new Error("grant_read_failed")
        if (grant?.status === "applied") activation = "active"
      }
    }

    return stripeJson({ verified: true, mode: session.livemode ? "live" : "test", plan, activation })
  } catch (error) {
    console.error("Stripe checkout verify failed:", error instanceof Error ? error.message : "unexpected")
    return stripeJson({ error: "No se pudo verificar el pago" }, 502)
  }
}
