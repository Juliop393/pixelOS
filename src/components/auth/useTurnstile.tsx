"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import s from "./Auth.module.css"

/*
 * Cloudflare Turnstile for Supabase Auth (signup, password sign-in, password recovery).
 * Off unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set: then nothing loads, no captchaToken is
 * sent and auth behaves exactly as before. The secret key lives only in Supabase
 * (Authentication → Attack Protection), never here.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
// A manual retry is ignored while the previous one is still settling (double clicks).
const RETRY_COOLDOWN_MS = 1500

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
    // A script that failed earlier (blocked, offline) is replaced, never loaded twice.
    document.querySelectorAll(`script[src="${SCRIPT_URL}"]`).forEach((node) => node.remove())
    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else { scriptPromise = null; reject(new Error("turnstile_missing")) }
    }
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
  failed: "No pudimos completar la verificación de seguridad. Pulsa «Reintentar verificación» e inténtalo de nuevo.",
  failedAgain: "La verificación de seguridad sigue sin completarse. Desactiva bloqueadores de anuncios o VPN, o prueba con otro navegador.",
  rejected: "La verificación de seguridad caducó o no es válida. Inténtalo de nuevo.",
}

/**
 * Renders the Turnstile challenge into `widget` and exposes the current single-use token.
 * Call reset() after every auth attempt: Turnstile tokens cannot be reused.
 * When Turnstile reports an error or its script cannot load, the form stays protected (no
 * token, no request) and the widget offers "Reintentar verificación".
 */
export function useTurnstile(action: "signup" | "login" | "recovery") {
  // A callback ref: the challenge is rendered again whenever its container remounts
  // (for example, when a form is hidden after submitting and shown again).
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)
  const [token, setToken] = useState("")
  const [failed, setFailed] = useState(false)
  // Manual retries since the last success; changes the message once a retry also failed.
  const [retries, setRetries] = useState(0)
  // Bumped to load the script again after it could not load.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const lastRetryAt = useRef(0)
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
          // Documented defaults, set explicitly: Turnstile retries failed challenges and refreshes expired tokens itself.
          retry: "auto",
          "refresh-expired": "auto",
          callback: (value: string) => { setToken(value); setFailed(false); setRetries(0); setInteractive(false) },
          "before-interactive-callback": () => setInteractive(true),
          "after-interactive-callback": () => setInteractive(false),
          // An expired or timed-out token is dropped at once, so it can never be sent.
          "expired-callback": () => setToken(""),
          "timeout-callback": () => setToken(""),
          "error-callback": (code: unknown) => {
            setToken("")
            setFailed(true)
            // Only the documented error code is logged (never the token); returning true marks it handled.
            const errorCode = typeof code === "string" || typeof code === "number" ? String(code) : ""
            console.warn("Turnstile error:", /^\d{5,6}$/.test(errorCode) ? errorCode : "unknown")
            return true
          },
        })
      })
      .catch(() => {
        if (cancelled) return
        console.warn("Turnstile error: script_load_failed")
        setFailed(true)
      })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [action, container, loadAttempt])

  const reset = useCallback(() => {
    if (!CAPTCHA_ENABLED) return
    setToken("")
    setFailed(false)
    setInteractive(false)
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [])

  /** "Reintentar verificación": reset the widget, or load the script again if it never loaded. */
  const retry = useCallback(() => {
    if (!CAPTCHA_ENABLED) return
    const now = Date.now()
    if (now - lastRetryAt.current < RETRY_COOLDOWN_MS) return
    lastRetryAt.current = now
    setToken("")
    setFailed(false)
    setInteractive(false)
    setRetries((count) => count + 1)
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
    else setLoadAttempt((count) => count + 1)
  }, [])

  /** Problem to show before calling Supabase, or null when the request may go ahead. */
  const blockingMessage = (): string | null => {
    if (!CAPTCHA_ENABLED || token) return null
    if (failed) return retries > 0 ? CAPTCHA_MESSAGES.failedAgain : CAPTCHA_MESSAGES.failed
    return interactive ? CAPTCHA_MESSAGES.interactive : CAPTCHA_MESSAGES.pending
  }

  const widget = CAPTCHA_ENABLED ? <div style={{ width: "100%" }}>
    <div ref={setContainer} style={{ width: "100%" }} />
    {failed && <div className={s.captchaRetry} role="alert">
      <p>{retries > 0 ? CAPTCHA_MESSAGES.failedAgain : "No pudimos completar la verificación de seguridad."}</p>
      <button type="button" onClick={retry}>Reintentar verificación</button>
    </div>}
  </div> : null

  return { enabled: CAPTCHA_ENABLED, token: CAPTCHA_ENABLED ? token : undefined, widget, reset, retry, blockingMessage }
}
