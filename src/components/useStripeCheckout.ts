"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

/*
 * One purchase flow for every buy button (plans and credit packs). The browser
 * only names what to buy; the server decides who may pay, which price is
 * charged and whether Stripe runs in test or live mode. Errors use the app's
 * existing toasts.
 */

export type CheckoutEndpoint = "/api/stripe/checkout" | "/api/stripe/packs/checkout"

const TOAST_ID = "stripe-checkout"

export const isStripeCheckoutUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com"
  } catch {
    return false
  }
}

function messageFor(status: number, code: unknown): string {
  if (status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión."
  if (status === 403) {
    return code === "subscription_required"
      ? "Los packs de créditos son para suscriptores activos."
      : "Los pagos todavía no están disponibles para esta cuenta."
  }
  if (status === 409 && code === "subscription_exists") return "Ya tienes una suscripción activa."
  if (status === 409 && code === "plan_unavailable") return "Este plan todavía no está disponible."
  if (status === 429) return "Demasiados intentos. Espera un momento."
  if (status === 503) return "Esta opción todavía no está disponible."
  return "No se pudo iniciar el pago. Inténtalo nuevamente."
}

export function useStripeCheckout(endpoint: CheckoutEndpoint) {
  const [pending, setPending] = useState<string | null>(null)
  const busy = useRef(false)

  const start = useCallback(async (key: string, body: Record<string, string>) => {
    // A ref, not state: a fast double click must not open two sessions.
    if (busy.current) return
    busy.current = true
    setPending(key)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Inicia sesión para continuar con el pago.", { id: TOAST_ID })
      } else {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const result: unknown = await response.json().catch(() => null)
        const data = (result && typeof result === "object" ? result : {}) as Record<string, unknown>

        if (response.ok && isStripeCheckoutUrl(data.url)) {
          window.location.assign(data.url)
          return // Keep the button busy while the browser leaves.
        }
        toast.error(messageFor(response.status, data.code), { id: TOAST_ID })
      }
    } catch {
      toast.error("No se pudo conectar con el servidor. Inténtalo nuevamente.", { id: TOAST_ID })
    }

    busy.current = false
    setPending(null)
  }, [endpoint])

  return { pending, start }
}

/** Says once that a Checkout was canceled (plans: ?checkout=canceled, packs: ?pack_checkout=canceled). */
export function useCheckoutCanceledNotice() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") === "canceled" || params.get("pack_checkout") === "canceled") {
      toast("Pago cancelado. No se realizó ningún cargo.", { id: "stripe-checkout-canceled" })
    }
  }, [])
}
