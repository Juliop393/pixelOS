"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowRight, Check, Image as ImageIcon, RotateCw, Sparkles, Video } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/pricing-plans"
import styles from "./success.module.css"

/*
 * Nothing here trusts the URL: a subscription is only celebrated once the
 * server verified the Checkout Session with Stripe for the signed-in user.
 */

type Verified = { mode: "test" | "live"; plan: SubscriptionPlan; activation: "preview" | "pending" | "active" }

type State =
  | { kind: "none" }
  | { kind: "checking" }
  | { kind: "incomplete" }
  | { kind: "error" }
  | { kind: "verified"; result: Verified }

function benefitsFor(plan: SubscriptionPlan): string[] {
  const credits = `${plan.monthlyCredits} créditos mensuales`

  if (plan.id === "starter") {
    return [
      credits,
      "Generación de imágenes publicitarias",
      "Generación de videos publicitarios",
      "Más libertad para probar ideas, ángulos y creativos",
      "Modo Simple, Modo Pro y PixelIA en un mismo flujo",
    ]
  }

  return [credits, ...plan.highlights]
}

async function verify(sessionId: string): Promise<State> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { kind: "error" }

  const response = await fetch("/api/stripe/checkout/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  })
  const body: unknown = await response.json().catch(() => null)
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>

  if (response.ok && data.verified === true) {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === data.plan)
    const mode = data.mode === "live" ? "live" : data.mode === "test" ? "test" : null
    const activation = data.activation
    if (plan && mode && (activation === "preview" || activation === "pending" || activation === "active")) {
      return { kind: "verified", result: { mode, plan, activation } }
    }
    return { kind: "error" }
  }

  if (response.status === 409 && data.code === "incomplete") return { kind: "incomplete" }
  if (response.status === 400 || response.status === 404 || response.status === 409) return { kind: "none" }
  return { kind: "error" }
}

interface Copy {
  eyebrow: string
  title: React.ReactNode
  lead: string
  benefitsTitle?: string
  note?: string
  retry?: string
}

function copyFor(state: State): Copy {
  switch (state.kind) {
    case "checking":
      return { eyebrow: "VERIFICANDO PAGO", title: "Estamos confirmando tu pago", lead: "Consultamos a Stripe para confirmar tu compra. Esto toma solo unos segundos." }
    case "incomplete":
      return {
        eyebrow: "PAGO EN PROCESO",
        title: "Tu pago aún no está confirmado",
        lead: "Stripe todavía no confirma este pago. Si acabas de pagar, espera unos segundos y vuelve a intentarlo.",
        retry: "Volver a verificar",
      }
    case "error":
      return {
        eyebrow: "VERIFICACIÓN PENDIENTE",
        title: "No pudimos verificar tu pago",
        lead: "Hubo un problema al consultar Stripe. Esto no afecta a tu pago; inténtalo nuevamente.",
        retry: "Reintentar",
      }
    case "none":
      return {
        eyebrow: "PIXELFM",
        title: "No hay un pago para confirmar",
        lead: "Esta página confirma suscripciones recién pagadas. Puedes revisar los planes o seguir creando.",
      }
    case "verified": {
      const { mode, plan, activation } = state.result
      if (mode === "test") {
        return {
          eyebrow: "PAGO DE PRUEBA",
          title: "¡Tu pago de prueba se completó correctamente!",
          lead: `Así se verá PixelFM ${plan.name} cuando tu suscripción real esté activa.`,
          benefitsTitle: `Vista previa de ${plan.name}`,
          note: "Esta es una compra de prueba. No se han agregado créditos reales.",
        }
      }
      if (activation === "active") {
        return {
          eyebrow: "SUSCRIPCIÓN CONFIRMADA",
          title: <>¡Bienvenido a PixelFM <span className={styles.accent}>{plan.name}</span>!</>,
          lead: "Tu suscripción está activa. Ya desbloqueaste más potencia para crear anuncios con IA.",
          benefitsTitle: "Lo que desbloqueaste",
          note: "Tu plan ya está listo. Empieza a crear desde el dashboard.",
        }
      }
      return {
        eyebrow: "PAGO CONFIRMADO",
        title: "Pago confirmado. Estamos preparando tu suscripción.",
        lead: "En unos instantes tu plan quedará listo para usar.",
        benefitsTitle: `Lo que incluye ${plan.name}`,
        note: "Tus créditos aparecerán en tu saldo en cuanto la suscripción esté lista.",
        retry: "Actualizar estado",
      }
    }
  }
}

export default function SubscriptionSuccessView({ sessionId }: { sessionId: string | null }) {
  const [state, setState] = useState<State>(sessionId ? { kind: "checking" } : { kind: "none" })

  const run = useCallback(async () => {
    if (!sessionId) return
    setState({ kind: "checking" })
    try {
      setState(await verify(sessionId))
    } catch {
      setState({ kind: "error" })
    }
  }, [sessionId])

  useEffect(() => {
    void run()
  }, [run])

  const copy = copyFor(state)
  const plan = state.kind === "verified" ? state.result.plan : null

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="success-title" aria-busy={state.kind === "checking"}>
        <span className={styles.glow} aria-hidden="true" />

        <div className={styles.logoWrap}>
          <span className={styles.logoRing} aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/pixelfm-logo-huron.webp" width={132} height={132} alt="PixelFM" />
        </div>

        <span className={styles.eyebrow}>
          <i aria-hidden="true" />
          {copy.eyebrow}
        </span>

        <h1 id="success-title">{copy.title}</h1>

        <p className={styles.lead}>{copy.lead}</p>

        {state.kind === "checking" && (
          <p className={styles.checking} role="status">
            <span aria-hidden="true" />
            Verificando con Stripe…
          </p>
        )}

        {copy.retry && (
          <button type="button" className={styles.retry} onClick={() => void run()}>
            <RotateCw aria-hidden="true" />
            {copy.retry}
          </button>
        )}

        {plan && copy.benefitsTitle && (
          <div className={styles.benefits}>
            <header>
              <Sparkles aria-hidden="true" />
              <h2>{copy.benefitsTitle}</h2>
            </header>
            <ul>
              {benefitsFor(plan).map((benefit) => (
                <li key={benefit}>
                  <span aria-hidden="true"><Check /></span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.actions}>
          <Link href="/dashboard/imagenes" className={styles.primary}>
            <ImageIcon aria-hidden="true" />
            Crear mi primera imagen
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/dashboard/videos" className={styles.secondary}>
            <Video aria-hidden="true" />
            Crear mi primer video
          </Link>
        </div>

        <p className={styles.note}>
          {copy.note ? `${copy.note} ` : ""}
          {state.kind === "none" ? <Link href="/dashboard/pricing">Ver planes</Link> : <Link href="/dashboard">Ir al inicio</Link>}
        </p>
      </section>
    </div>
  )
}
