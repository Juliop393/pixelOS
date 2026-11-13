"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/*
 * Cloudflare Turnstile for Supabase Auth (signup, password sign-in, password recovery).
 * Off unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set: then nothing loads, no captchaToken is
 * sent and auth behaves exactly as before. The secret key lives only in Supabase
 * (Authentication → Attack Protection), never here.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

export const CAPTCHA_ENABLED = SITE_KEY.length > 0

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile_missing")))
    script.onerror = () => { scriptPromise = null; reject(new Error("turnstile_load_failed")) }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** True when Supabase rejected the request because of the captcha (missing, expired or invalid). */
export const isCaptchaError = (message: string | undefined | null) => Boolean(message && /captcha/i.test(message))

export const CAPTCHA_MESSAGES = {
  pending: "Estamos verificando tu conexión. Espera un momento y vuelve a intentarlo.",
  interactive: "Completa la verificación de seguridad que aparece arriba para continuar.",
  failed: "No pudimos completar la verificación de seguridad. Recarga la página e inténtalo de nuevo.",
  rejected: "La verificación de seguridad caducó o no es válida. Inténtalo de nuevo.",
}

/**
 * Renders the Turnstile challenge into `widget` and exposes the current single-use token.
 * Call reset() after every auth attempt: Turnstile tokens cannot be reused.
 */
export function useTurnstile(action: "signup" | "login" | "recovery") {
  // A callback ref: the challenge is rendered again whenever its container remounts
  // (for example, when a form is hidden after submitting and shown again).
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)
  const [token, setToken] = useState("")
  const [failed, setFailed] = useState(false)
  // Managed mode may ask the visitor to interact; the widget becomes visible then.
  const [interactive, setInteractive] = useState(false)

  useEffect(() => {
    if (!CAPTCHA_ENABLED || !container) return
    let cancelled = false
    setToken("")
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || widgetId.current) return
        widgetId.current = turnstile.render(container, {
          sitekey: SITE_KEY,
          action,
          theme: "dark",
          language: "es",
          // "flexible" needs at least 300 px; narrower forms (small phones) get the compact widget.
          size: container.clientWidth < 300 ? "compact" : "flexible",
          appearance: "interaction-only",
          callback: (value: string) => { setToken(value); setFailed(false); setInteractive(false) },
          "before-interactive-callback": () => setInteractive(true),
          "after-interactive-callback": () => setInteractive(false),
          "expired-callback": () => setToken(""),
          "timeout-callback": () => setToken(""),
          "error-callback": () => { setToken(""); setFailed(true) },
        })
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [action, container])

  const reset = useCallback(() => {
    if (!CAPTCHA_ENABLED) return
    setToken("")
    setInteractive(false)
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [])

  /** Problem to show before calling Supabase, or null when the request may go ahead. */
  const blockingMessage = (): string | null => {
    if (!CAPTCHA_ENABLED || token) return null
    if (failed) return CAPTCHA_MESSAGES.failed
    return interactive ? CAPTCHA_MESSAGES.interactive : CAPTCHA_MESSAGES.pending
  }

  const widget = CAPTCHA_ENABLED ? <div ref={setContainer} style={{ width: "100%" }} /> : null

  return { enabled: CAPTCHA_ENABLED, token: CAPTCHA_ENABLED ? token : undefined, widget, reset, blockingMessage }
}
