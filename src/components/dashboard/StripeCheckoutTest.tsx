"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import styles from "@/components/PricingPlans.module.css"

/*
 * TEMPORARY: lets the one authorized account open a Stripe TEST Checkout for
 * Starter. Only shown with ?stripe_test=1; the server decides who may pay.
 * Remove together with the guard in /api/stripe/checkout.
 */

const MESSAGES: Record<number, string> = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "Esta cuenta no está autorizada para la prueba.",
  409: "Esta cuenta ya tiene una suscripción activa.",
  429: "Demasiados intentos. Espera un momento.",
}

const isStripeCheckoutUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com"
  } catch {
    return false
  }
}

export default function StripeCheckoutTest() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setVisible(new URLSearchParams(window.location.search).get("stripe_test") === "1")
  }, [])

  if (!visible) return null

  const startCheckout = async () => {
    if (loading) return
    setLoading(true)
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError(MESSAGES[401])
        setLoading(false)
        return
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter" }),
      })
      const result: unknown = await response.json().catch(() => null)
      const url = result && typeof result === "object" && "url" in result ? result.url : null

      if (response.ok && isStripeCheckoutUrl(url)) {
        window.location.assign(url)
        return
      }

      setError(MESSAGES[response.status] ?? "No se pudo iniciar la prueba de pago. Inténtalo nuevamente.")
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo nuevamente.")
    }
    setLoading(false)
  }

  return (
    <aside className={styles.explainer} style={{ margin: "0 0 32px" }} aria-label="Prueba de Stripe">
      <div>
        <h3>Prueba de Stripe · modo TEST</h3>
        <p>Abre Checkout de Starter mensual ($19) en modo de prueba. No se cobra dinero real ni se otorgan créditos todavía.</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={`${styles.cta} ${styles.ctaFeatured}`}
        style={{ width: "auto", marginTop: 0 }}
      >
        {loading ? "Abriendo Checkout..." : "Probar Stripe Starter — TEST"}
      </button>
    </aside>
  )
}
