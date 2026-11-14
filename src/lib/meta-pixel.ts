/*
 * Meta Pixel, kept minimal: PageView only, after the visitor accepts advertising cookies.
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
