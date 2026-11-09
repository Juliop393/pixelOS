"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { CreditPack } from "@/lib/pricing-plans"

/*
 * TEMPORARY: shared purchase handler for the three credit packs while Stripe
 * runs in test mode. It only turns on with ?stripe_test=1; the server decides
 * who may pay (authorized test account, test key, active subscription).
 * Remove together with the guard in /api/stripe/packs/checkout.
 */

const MESSAGES: Record<number, string> = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  429: "Demasiados intentos. Espera un momento.",
  503: "Este pack todavía no está disponible.",
}

const NOTICES: Record<string, string> = {
  processing: "Stripe recibió tu pago de prueba. Estamos procesando el pack; en modo prueba no se agregan créditos a tu saldo.",
  canceled: "Compra cancelada. No se realizó ningún cargo.",
}

export const isStripeCheckoutUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com"
  } catch {
    return false
  }
}

export function useStripePackCheckout() {
  const [enabled, setEnabled] = useState(false)
  const [notice, setNotice] = useState("")
  const [pendingPack, setPendingPack] = useState<string | null>(null)
  const [error, setError] = useState("")
  const busy = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setEnabled(params.get("stripe_test") === "1")
    // A return with session_id is confirmed by PackPurchaseCard instead of this generic notice.
    const checkout = params.get("pack_checkout") ?? ""
    setNotice(checkout === "processing" && params.has("session_id") ? "" : NOTICES[checkout] ?? "")
  }, [])

  const purchase = useCallback(async (pack: CreditPack) => {
    // A ref, not state: a fast double click must not open two sessions.
    if (busy.current) return
    busy.current = true
    setPendingPack(pack.id)
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError(MESSAGES[401])
        return
      }

      const response = await fetch("/api/stripe/packs/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pack: pack.id }),
      })
      const result: unknown = await response.json().catch(() => null)
      const data = (result && typeof result === "object" ? result : {}) as Record<string, unknown>

      if (response.ok && isStripeCheckoutUrl(data.url)) {
        window.location.assign(data.url)
        return // Keep the button busy while the browser leaves.
      }

      if (response.status === 403) {
        setError(data.code === "subscription_required"
          ? "Los packs de créditos son para suscriptores activos."
          : "Esta cuenta no está autorizada para la prueba.")
      } else {
        setError(MESSAGES[response.status] ?? "No se pudo iniciar el pago. Inténtalo nuevamente.")
      }
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo nuevamente.")
    }

    busy.current = false
    setPendingPack(null)
  }, [])

  return { enabled, notice, pendingPack, error, purchase: enabled ? purchase : undefined }
}
