"use client"

import { useEffect, useState, type MouseEvent } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { META_PIXEL_ENABLED, clearMetaCookies, loadMetaPixel, readAdsConsent, saveAdsConsent, trackCompleteRegistration, trackPageView, type AdsConsent } from "@/lib/meta-pixel"
import { supabase } from "@/lib/supabase"
import s from "./MetaPixel.module.css"

const OPEN_PREFERENCES_EVENT = "pf:cookie-preferences"

/*
 * The single Meta Pixel integration, mounted once in the root layout. Nothing renders or loads
 * without NEXT_PUBLIC_META_PIXEL_ID. With it, a small notice asks for consent; Meta's script is
 * loaded only after "Aceptar", and then one PageView is sent per route (App Router navigations
 * included). "Rechazar" keeps everything off. "Preferencias de cookies" opens the same notice again.
 */
export default function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // undefined until read on the client, so the server render and hydration never show the notice.
  const [consent, setConsent] = useState<AdsConsent | null | undefined>(undefined)
  // The notice reopened from "Preferencias de cookies" after a choice was made.
  const [reopened, setReopened] = useState(false)

  useEffect(() => {
    if (!META_PIXEL_ENABLED) return
    setConsent(readAdsConsent())
    const open = () => setReopened(true)
    window.addEventListener(OPEN_PREFERENCES_EVENT, open)
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open)
  }, [])

  useEffect(() => {
    if (consent !== "granted") return
    // Both are idempotent: the script loads once and each URL is reported once.
    loadMetaPixel()
    const search = new URLSearchParams(searchParams.toString())
    trackPageView(pathname, search)
    // A just-confirmed account reaching any trackable page counts once (see trackCompleteRegistration).
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void trackCompleteRegistration(session.user, pathname, search)
    })
  }, [consent, pathname, searchParams])

  // The session can also start without a route change (confirmation link exchanged on the same page).
  useEffect(() => {
    if (consent !== "granted") return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session) return
      const user = session.user
      // Deferred: Supabase must not be re-entered from inside its own auth callback.
      setTimeout(() => {
        void trackCompleteRegistration(user, window.location.pathname, new URLSearchParams(window.location.search))
      }, 0)
    })
    return () => subscription.unsubscribe()
  }, [consent])

  if (!META_PIXEL_ENABLED || consent === undefined || (consent !== null && !reopened)) return null

  const choose = (value: AdsConsent) => {
    saveAdsConsent(value)
    setReopened(false)
    if (value === "denied" && window.fbq) {
      // Meta was already running on this page: drop its cookies and reload so its script is gone.
      clearMetaCookies()
      window.location.reload()
      return
    }
    setConsent(value)
  }

  return <div className={s.notice} role="region" aria-label="Preferencias de cookies">
    <p>
      Usamos cookies de Meta para medir nuestros anuncios. Solo se activan si aceptas.{" "}
      <Link href="/privacy">Privacidad</Link>
    </p>
    <div className={s.actions}>
      <button type="button" className={s.decline} onClick={() => choose("denied")}>Rechazar</button>
      <button type="button" className={s.accept} onClick={() => choose("granted")}>Aceptar</button>
    </div>
  </div>
}

/** "Preferencias de cookies" for the footer: reopens the consent notice. Not rendered without a Pixel ID. */
export function CookiePreferencesLink() {
  if (!META_PIXEL_ENABLED) return null
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))
  }
  return <a href="#preferencias-cookies" role="button" onClick={open}>Preferencias de cookies</a>
}
