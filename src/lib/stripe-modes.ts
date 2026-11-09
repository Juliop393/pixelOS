import "server-only"

import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase-admin"

/*
 * Stripe TEST and LIVE share one database (migration 015). Every billing
 * operation works only with the customer and subscriptions of the active mode,
 * which the server key decides; the browser never does.
 *
 * Rows recorded before 015 may still be unclassified (livemode NULL). They are
 * classified here against Stripe, never from the ID prefix: if the active key
 * can read the object, its livemode decides; if Stripe answers
 * resource_missing, the object belongs to the other mode.
 */

type Admin = ReturnType<typeof createAdminClient>

export const activeLivemode = () => (process.env.STRIPE_SECRET_KEY?.trim() ?? "").startsWith("sk_live_")

const isMissing = (error: unknown) => {
  const e = error as { statusCode?: number; code?: string } | null
  return e?.statusCode === 404 || e?.code === "resource_missing"
}

async function classify(admin: Admin, table: "stripe_customers" | "stripe_subscriptions", id: string): Promise<boolean> {
  const active = activeLivemode()
  let livemode: boolean
  try {
    const object = table === "stripe_customers"
      ? await getStripe().customers.retrieve(id)
      : await getStripe().subscriptions.retrieve(id)
    // A deleted customer has no livemode field, but the active key could read it: same mode.
    livemode = "livemode" in object && typeof object.livemode === "boolean" ? object.livemode : active
  } catch (error) {
    if (!isMissing(error)) throw new Error("stripe_unavailable")
    livemode = !active
  }

  const key = table === "stripe_customers" ? "stripe_customer_id" : "stripe_subscription_id"
  const { error } = await admin.from(table).update({ livemode }).eq(key, id).is("livemode", null)
  if (error) throw new Error("mode_write_failed")
  return livemode
}

/** The user's Stripe customer in the active mode, or null. */
export async function getModeCustomer(admin: Admin, userId: string): Promise<string | null> {
  const active = activeLivemode()
  const { data, error } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id, livemode")
    .eq("user_id", userId)

  if (error) throw new Error("customer_read_failed")
  for (const row of data ?? []) {
    const livemode = row.livemode === null ? await classify(admin, "stripe_customers", row.stripe_customer_id) : row.livemode
    if (livemode === active) return row.stripe_customer_id as string
  }
  return null
}

/** True when the customer belongs to this user in the active mode. */
export async function isModeCustomer(admin: Admin, userId: string, customerId: string | null): Promise<boolean> {
  return Boolean(customerId) && (await getModeCustomer(admin, userId)) === customerId
}

/** The user's subscriptions in the active mode. */
export async function getModeSubscriptions(admin: Admin, userId: string) {
  const active = activeLivemode()
  const { data, error } = await admin
    .from("stripe_subscriptions")
    .select("stripe_subscription_id, stripe_customer_id, status, livemode")
    .eq("user_id", userId)

  if (error) throw new Error("subscription_read_failed")
  const rows: { stripe_subscription_id: string; stripe_customer_id: string; status: string }[] = []
  for (const row of data ?? []) {
    const livemode = row.livemode === null ? await classify(admin, "stripe_subscriptions", row.stripe_subscription_id) : row.livemode
    if (livemode === active) rows.push(row)
  }
  return rows
}

/** Records a subscription the active key could not find as belonging to the other mode. */
export async function markOtherMode(admin: Admin, subscriptionId: string) {
  const { error } = await admin
    .from("stripe_subscriptions")
    .update({ livemode: !activeLivemode() })
    .eq("stripe_subscription_id", subscriptionId)
    .is("livemode", null)
  if (error) throw new Error("mode_write_failed")
}
