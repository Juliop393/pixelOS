/*
 * Where to send a user after signing in, when they arrived from a flow that needs
 * an account (e.g. choosing a plan while signed out). Only these exact internal
 * paths are accepted, so the parameter can never redirect anywhere else.
 */
const NEXT_PATHS = new Set(["/dashboard/pricing"])

export const AUTH_NEXT_PARAM = "next"
/** Short-lived cookie that carries the destination through the Google OAuth round trip. */
export const AUTH_NEXT_COOKIE = "pf_auth_next"
export const PRICING_NEXT_PATH = "/dashboard/pricing"

export function safeNextPath(value: string | null | undefined): string | null {
  return value && NEXT_PATHS.has(value) ? value : null
}

/** /login or /register keeping a valid destination. */
export function authPath(page: "/login" | "/register", next: string | null): string {
  const safe = safeNextPath(next)
  return safe ? `${page}?${AUTH_NEXT_PARAM}=${encodeURIComponent(safe)}` : page
}
