import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, stripeJson } from "@/lib/stripe-api"
import { getPackAmountCents, getPackDetails, getStripePackByPrice, PACK_CURRENCY } from "@/lib/stripe-packs"
import { isModeCustomer } from "@/lib/stripe-modes"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

/*
 * Read-only confirmation for a credit pack Checkout, for TEST and LIVE alike.
 * It re-reads the session from Stripe, applies the same checks as the webhook
 * and then only looks up the lot the webhook recorded. It never writes and never
 * grants credits: "applied" is reported only when that lot exists as applied.
 *
 * status:
 *   simulated  TEST payment recorded (no real credits)
 *   applied    LIVE payment recorded and credited
 *   pending    paid and verified, but the webhook has not recorded it yet
 */

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,240}$/

const NOT_FOUND = { error: "No encontramos esta compra", code: "not_found" }
const UNVERIFIED = { error: "No pudimos confirmar esta compra", code: "unverified" }

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null

/** Fails closed. Looser than Checkout's limit, since the card may re-check. */
async function isWithinVerifyLimit(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_and_record_api_rate_limit", {
    p_user_id: userId,
    p_endpoint: "stripe-pack-verify",
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
      session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["line_items", "payment_intent"] })
    } catch (error) {
      const status = (error as { statusCode?: number } | null)?.statusCode
      if (status === 404) return stripeJson(NOT_FOUND, 404)
      throw new Error("stripe_unavailable")
    }

    // Ownership first, so nothing about another user's session is revealed.
    const metadataUser = session.metadata?.supabase_user_id
    if (
      session.client_reference_id !== user.id || session.livemode !== liveKey ||
      (metadataUser && metadataUser !== user.id) || session.mode !== "payment"
    ) {
      return stripeJson(NOT_FOUND, 404)
    }

    const admin = createAdminClient()
    if (!(await isModeCustomer(admin, user.id, idOf(session.customer)))) {
      return stripeJson(NOT_FOUND, 404)
    }

    if (session.status !== "complete" || session.payment_status !== "paid") {
      return stripeJson({ error: "El pago todavía no está confirmado", code: "incomplete" }, 409)
    }

    // Same pack checks as the webhook: one line, a pack Price, quantity 1, catalog amount.
    const items = session.line_items
    const item = items && !items.has_more && items.data.length === 1 ? items.data[0] : null
    const pack = getStripePackByPrice(item?.price?.id)
    if (!item || !pack) return stripeJson(UNVERIFIED, 409)

    const metadataPack = session.metadata?.kind === "credit_pack" ? session.metadata.pack : undefined
    const expected = getPackAmountCents(pack)
    if (
      (metadataPack !== undefined && metadataPack !== pack) || item.quantity !== 1 ||
      // Integration-currency fields only (see the webhook): valid under Adaptive Pricing too.
      session.currency !== PACK_CURRENCY || session.amount_total !== expected ||
      item.price?.currency !== PACK_CURRENCY || item.price?.unit_amount !== expected
    ) {
      return stripeJson(UNVERIFIED, 409)
    }

    const paymentIntent = session.payment_intent
    if (!paymentIntent || typeof paymentIntent === "string" || paymentIntent.status !== "succeeded") {
      return stripeJson({ error: "El pago todavía no está confirmado", code: "incomplete" }, 409)
    }
    if (
      paymentIntent.livemode !== liveKey || paymentIntent.currency !== PACK_CURRENCY ||
      paymentIntent.amount !== expected
    ) {
      return stripeJson(UNVERIFIED, 409)
    }

    // Only the webhook records lots; here we just look for the one it wrote.
    const { data: lot, error: lotError } = await admin
      .from("credit_pack_lots")
      .select("user_id, pack, livemode, status")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .maybeSingle()

    if (lotError) throw new Error("lot_read_failed")

    const credits = getPackDetails(pack).credits
    const mode = liveKey ? "live" : "test"

    if (!lot) return stripeJson({ verified: true, mode, pack, credits, status: "pending" })

    const expectedStatus = liveKey ? "applied" : "simulated"
    if (lot.user_id !== user.id || lot.pack !== pack || lot.livemode !== liveKey || lot.status !== expectedStatus) {
      return stripeJson(UNVERIFIED, 409)
    }

    return stripeJson({ verified: true, mode, pack, credits, status: expectedStatus })
  } catch (error) {
    console.error("Stripe pack verify failed:", error instanceof Error ? error.message : "unexpected")
    return stripeJson({ error: "No se pudo verificar la compra" }, 502)
  }
}
