import { createHash, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getStripePriceInfo, isAnnualDeliveryConfigured } from "@/lib/stripe-plans"
import { syncSubscription } from "@/lib/stripe-subscriptions"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/*
 * Internal job for annual plans: delivers the current month's credits of every
 * running annual subscription. Meant for an n8n Schedule (hourly); safe to run
 * any number of times, in parallel or late, because the database grants each
 * month of a term once (deliver_annual_subscription_credits, migration 014).
 *
 * Every candidate is re-read from Stripe first (status, Price and paid term),
 * so a canceled, unpaid or other-mode subscription never receives credits.
 * Protected by PIXELFM_CRON_SECRET: Authorization: Bearer <secret>.
 */

const MAX_PER_RUN = 200
const RUNNING = ["active", "trialing"]

const digest = (value: string) => createHash("sha256").update(value).digest()

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.PIXELFM_CRON_SECRET?.trim() ?? ""
  const header = req.headers.get("authorization") ?? ""
  // Fixed-length digests: the comparison takes the same time whatever was sent.
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
}

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })

export async function POST(req: NextRequest) {
  if (!isAnnualDeliveryConfigured()) return json({ error: "No configurado" }, 503)
  if (!isAuthorized(req)) return json({ error: "No autorizado" }, 401)

  const liveKey = (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from("stripe_subscriptions")
    .select("stripe_subscription_id, stripe_price_id")
    .in("status", RUNNING)
    .gt("current_period_end", new Date().toISOString())
    .order("current_period_end", { ascending: true })
    .limit(1000)

  if (error) {
    console.error("Annual deliveries: subscription read failed")
    return json({ error: "Error interno" }, 500)
  }

  const candidates = (rows ?? [])
    .filter((row) => getStripePriceInfo(row.stripe_price_id)?.interval === "annual")
    .slice(0, MAX_PER_RUN)

  const counts: Record<string, number> = { applied: 0, upgraded: 0, duplicate: 0, stale: 0, simulated: 0, inactive: 0, skipped: 0, failed: 0 }

  for (const row of candidates) {
    const id = row.stripe_subscription_id as string
    try {
      // Fresh from Stripe, and the mirror refreshed with it.
      const subscription = await syncSubscription(admin, id)
      const item = subscription.items.data[0]
      if (subscription.livemode !== liveKey) { counts.skipped += 1; continue }
      if (!RUNNING.includes(subscription.status)) { counts.inactive += 1; continue }
      if (subscription.items.data.length !== 1 || getStripePriceInfo(item?.price.id)?.interval !== "annual") {
        counts.skipped += 1
        continue
      }

      const { data: result, error: rpcError } = await admin.rpc("deliver_annual_subscription_credits", {
        p_subscription_id: id,
        p_livemode: subscription.livemode,
      })
      if (rpcError) throw new Error(`deliver_failed: ${rpcError.message.slice(0, 120)}`)
      const outcome = String(result)
      if (!(outcome in counts)) throw new Error(`deliver_unexpected: ${outcome.slice(0, 40)}`)
      counts[outcome] += 1
    } catch (failure) {
      // A subscription of the other Stripe mode (or deleted) does not exist for this key.
      if ((failure as { statusCode?: number } | null)?.statusCode === 404) {
        counts.skipped += 1
        continue
      }
      counts.failed += 1
      console.error("Annual delivery failed:", id, failure instanceof Error ? failure.message : "unexpected")
    }
  }

  // Any failure makes the run fail, so n8n retries it (each month is still granted once).
  return json({ checked: candidates.length, ...counts }, counts.failed > 0 ? 500 : 200)
}
