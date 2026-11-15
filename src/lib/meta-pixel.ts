/*
 * Meta Pixel, kept minimal: PageView, CompleteRegistration and Purchase, after the visitor accepts advertising cookies.
 * Off unless NEXT_PUBLIC_META_PIXEL_ID is set (digits only); then nothing loads and no
 * consent prompt is shown. No personal data is ever sent: Meta reports the page URL with
 * every event, so pages whose URL can carry personal or sensitive data are never tracked.
 */

const RAW_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? ""
export const META_PIXEL_ID = /^\d{5,20}$/.test(RAW_ID) ? RAW_ID : ""
export const META_PIXEL_ENABLED = META_PIXEL_ID.length > 0

const CONSENT_KEY = "pf_ads_consent"
export type AdsConsent = "granted" | "denied"

export function readAdsConsent(): AdsConsent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === "granted" || value === "denied" ? value : null
  } catch {
    return null
  }
}

export function saveAdsConsent(value: AdsConsent) {
  try { localStorage.setItem(CONSENT_KEY, value) } catch { /* storage unavailable: asked again next visit */ }
}

// Pages whose URL may hold an email, auth tokens or payment session ids.
const PRIVATE_PATHS = ["/confirm-email", "/auth/", "/reset-password", "/dashboard/subscription/success"]
// Query parameters that are safe to report (campaign attribution and plain UI flags).
const SAFE_PARAMS = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "checkout", "pack_checkout", "next"])

/** True when the current URL can be reported to Meta without exposing personal data. */
export function isTrackableUrl(pathname: string, search: URLSearchParams): boolean {
  if (PRIVATE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))) return false
  for (const key of search.keys()) if (!SAFE_PARAMS.has(key)) return false
  return true
}

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown }

declare global {
  interface Window { fbq?: Fbq; _fbq?: Fbq }
}

/** Meta's standard base code, run once: queues calls until fbevents.js loads (async, never blocks rendering). */
export function loadMetaPixel() {
  if (!META_PIXEL_ENABLED || window.fbq) return
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  } as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []
  window.fbq = fbq
  window._fbq = fbq

  const script = document.createElement("script")
  script.async = true
  script.src = "https://connect.facebook.net/en_US/fbevents.js"
  document.head.appendChild(script)

  // No automatic events (button clicks, page metadata): only the PageView calls below are sent.
  fbq("set", "autoConfig", false, META_PIXEL_ID)
  fbq("init", META_PIXEL_ID)
}

/**
 * Removes Meta's first-party cookies (_fbp, and _fbc when an ad click set it). They are written by
 * Meta's script on our domain, usually on the parent domain, so every scope it may have used is cleared.
 */
export function clearMetaCookies() {
  const host = window.location.hostname
  const parts = host.split(".")
  const domains = new Set(["", host, `.${host}`])
  if (parts.length >= 2) domains.add(`.${parts.slice(-2).join(".")}`)
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`
    }
  }
}

/*
 * CompleteRegistration: the first signed-in session of an account created and confirmed in the
 * last 24 hours (Supabase sets email_confirmed_at when the confirmation link is opened; new
 * Google accounts are confirmed on creation). Existing users never count, even if they confirm
 * an email now. An approximation of a confirmed signup, not an exhaustive or cross-device count.
 * Sent once per account in this browser; only a hash of the account id is kept locally, and
 * nothing about the user is sent to Meta.
 */
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000
const REGISTRATION_KEY = "pf_meta_registration"
const registrationPending = new Set<string>()

async function accountMarker(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId))
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function readRegistrationMarkers(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(REGISTRATION_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

/** True only for a valid timestamp within the last REGISTRATION_WINDOW_MS (missing or invalid → false). */
function isRecent(timestamp: string | null | undefined): boolean {
  if (!timestamp) return false
  const time = Date.parse(timestamp)
  if (!Number.isFinite(time)) return false
  const age = Date.now() - time
  return age >= 0 && age <= REGISTRATION_WINDOW_MS
}

export async function trackCompleteRegistration(
  user: { id: string; created_at?: string | null; email_confirmed_at?: string | null },
  pathname: string,
  search: URLSearchParams,
) {
  if (!META_PIXEL_ENABLED || !window.fbq) return
  // Both the account and its confirmation must be recent: an old account that confirms an email
  // (or changes it) now is not a new registration.
  if (!isRecent(user.created_at) || !isRecent(user.email_confirmed_at)) return
  // Same rule as PageView: never on a URL that can carry personal data (e.g. the confirmation ?code=).
  if (!isTrackableUrl(pathname, search)) return
  if (registrationPending.has(user.id)) return
  registrationPending.add(user.id)
  try {
    const marker = await accountMarker(user.id)
    const markers = readRegistrationMarkers()
    if (markers.includes(marker)) return
    // Recorded before sending: a reload or a repeated callback can never send it twice.
    try { localStorage.setItem(REGISTRATION_KEY, JSON.stringify([...markers, marker].slice(-20))) } catch { return }
    window.fbq("track", "CompleteRegistration")
  } finally {
    registrationPending.delete(user.id)
  }
}

/*
 * Purchase: one per Checkout Session the server verified as paid in LIVE, with the amount Stripe
 * charged (see the Stripe verify routes and checkout-purchase.ts). Checkout returns to URLs that carry
 * the Stripe session id, and Meta reports the page URL with every event, so the purchase is only
 * queued there and sent on the next trackable page (closing the pack card, moving on from the
 * success page, or the next visit within a day). Locally only hashes of the session id are kept;
 * Meta receives value and currency, nothing else.
 */
const PURCHASE_PENDING_KEY = "pf_meta_purchase_pending"
const PURCHASE_SENT_KEY = "pf_meta_purchases"
const PURCHASE_PENDING_MS = 24 * 60 * 60 * 1000
const PURCHASE_EVENT = "pf:meta-purchase"
type PendingPurchase = { m: string; v: number; c: "USD"; t: number }

function readList<T>(key: string, valid: (item: unknown) => item is T): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter(valid) : []
  } catch {
    return []
  }
}

const isMarker = (item: unknown): item is string => typeof item === "string"
const isPending = (item: unknown): item is PendingPurchase => {
  const p = item as PendingPurchase | null
  return !!p && typeof p.m === "string" && typeof p.v === "number" && Number.isFinite(p.v) && p.v > 0 &&
    p.c === "USD" && typeof p.t === "number"
}

/** Called by the Checkout return views after their server verification confirmed a LIVE payment. */
export async function queuePurchase(sessionId: string, purchase: unknown) {
  if (!META_PIXEL_ENABLED || readAdsConsent() !== "granted") return
  const p = purchase as { value?: unknown; currency?: unknown } | null
  if (!p || typeof p.value !== "number" || !Number.isFinite(p.value) || p.value <= 0 || p.currency !== "USD") return
  const marker = await accountMarker(sessionId)
  const sent = readList(PURCHASE_SENT_KEY, isMarker)
  const pending = readList(PURCHASE_PENDING_KEY, isPending)
  if (sent.includes(marker) || pending.some((item) => item.m === marker)) return
  try {
    localStorage.setItem(PURCHASE_PENDING_KEY, JSON.stringify([...pending, { m: marker, v: p.value, c: "USD", t: Date.now() }].slice(-10)))
  } catch {
    return
  }
  window.dispatchEvent(new Event(PURCHASE_EVENT))
}

/** Sends queued purchases, each once, when the current URL is safe to report. */
export function flushPurchases(pathname: string, search: URLSearchParams) {
  if (!META_PIXEL_ENABLED || !window.fbq || !isTrackableUrl(pathname, search)) return
  const pending = readList(PURCHASE_PENDING_KEY, isPending)
  if (pending.length === 0) return
  const sent = readList(PURCHASE_SENT_KEY, isMarker)
  const now = Date.now()
  const due = pending.filter((item) => now - item.t <= PURCHASE_PENDING_MS && !sent.includes(item.m))
  // Recorded and dequeued before sending: a reload or a second tab can never send one twice.
  try {
    localStorage.setItem(PURCHASE_SENT_KEY, JSON.stringify([...sent, ...due.map((item) => item.m)].slice(-50)))
    localStorage.removeItem(PURCHASE_PENDING_KEY)
  } catch {
    return
  }
  for (const item of due) window.fbq("track", "Purchase", { value: item.v, currency: item.c })
}

export const META_PURCHASE_EVENT = PURCHASE_EVENT

let lastTrackedUrl: string | null = null

/** One PageView per distinct URL (re-renders, Strict Mode and repeated effects send nothing more). */
export function trackPageView(pathname: string, search: URLSearchParams) {
  if (!META_PIXEL_ENABLED || !window.fbq) return
  const url = `${pathname}?${search.toString()}`
  if (url === lastTrackedUrl) return
  lastTrackedUrl = url
  if (!isTrackableUrl(pathname, search)) return
  window.fbq("track", "PageView")
}
