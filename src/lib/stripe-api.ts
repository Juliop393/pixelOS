import "server-only"

import { createClient, type User } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

const NO_STORE = { "Cache-Control": "no-store" }

export const stripeJson = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE })

export async function getRequestUser(req: NextRequest): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const header = req.headers.get("authorization")
  if (!url || !anonKey || !header?.startsWith("Bearer ")) return null

  const { data: { user }, error } = await createClient(url, anonKey).auth.getUser(header.slice(7))
  return error ? null : user
}

/** Fails closed: without a working limiter no billing session is created. */
export async function isWithinBillingLimit(userId: string, endpoint: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_and_record_api_rate_limit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_short_limit: 5,
    p_short_window_seconds: 60,
    p_daily_limit: 30,
  })

  if (error) throw new Error("rate_limit_failed")
  return data === "allowed"
}

/*
 * Who may open a Checkout (plans or packs). The server key decides the mode:
 *   sk_test_  only the account in STRIPE_TEST_ALLOWED_USER_ID (test charges only)
 *   sk_live_  closed unless STRIPE_LIVE_CHECKOUT_ENABLED is exactly "true";
 *             then any signed-in user, still subject to each route's checks
 *   other     closed
 */
export function isStripeCheckoutAllowed(userId: string): boolean {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
  if (secretKey.startsWith("sk_test_")) {
    const allowedUserId = process.env.STRIPE_TEST_ALLOWED_USER_ID?.trim()
    return Boolean(allowedUserId) && userId === allowedUserId
  }
  if (secretKey.startsWith("sk_live_")) {
    return process.env.STRIPE_LIVE_CHECKOUT_ENABLED?.trim() === "true"
  }
  return false
}

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "")
  if (!url) throw new Error("Falta NEXT_PUBLIC_SITE_URL en el entorno")
  return url
}
