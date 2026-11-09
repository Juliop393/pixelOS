import "server-only"

import type Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { getStripePlanByPrice } from "@/lib/stripe-plans"
import { createAdminClient } from "@/lib/supabase-admin"

/*
 * Mirrors one Stripe subscription into stripe_subscriptions, always from a
 * fresh read, so events arriving out of order are harmless. Shared by the
 * webhook and the internal annual-delivery job.
 */

type Admin = ReturnType<typeof createAdminClient>

const toDate = (seconds: number | null | undefined) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null

export const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id ?? null

async function resolveUserId(admin: Admin, subscription: Stripe.Subscription, customerId: string, hint?: string | null) {
  const { data, error } = await admin
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()

  if (error) throw new Error("customer_read_failed")

  const userId = data?.user_id ?? hint ?? subscription.metadata.supabase_user_id
  if (!userId) throw new Error("subscription_without_user")
  return userId as string
}

export async function syncSubscription(admin: Admin, subscriptionId: string, userHint?: string | null): Promise<Stripe.Subscription> {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  const customerId = idOf(subscription.customer)
  if (!customerId) throw new Error("subscription_without_customer")

  const item = subscription.items.data[0]
  const priceId = item?.price.id ?? null

  const { error } = await admin.from("stripe_subscriptions").upsert(
    {
      stripe_subscription_id: subscription.id,
      user_id: await resolveUserId(admin, subscription, customerId, userHint),
      stripe_customer_id: customerId,
      status: subscription.status,
      stripe_price_id: priceId,
      plan: getStripePlanByPrice(priceId),
      current_period_start: toDate(item?.current_period_start),
      current_period_end: toDate(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: toDate(subscription.cancel_at),
      canceled_at: toDate(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  )

  if (error) throw new Error("subscription_write_failed")
  return subscription
}
