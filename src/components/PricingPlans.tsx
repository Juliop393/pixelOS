"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { CREDIT_COST, CREDIT_RATES, SUBSCRIPTION_PLANS, formatPrice, isPlanCheckoutReady, planOutcome, type BillingInterval } from "@/lib/pricing-plans"
import { useCheckoutCanceledNotice, useStripeCheckout } from "@/components/useStripeCheckout"
import styles from "@/components/PricingPlans.module.css"
import PlanChangeDialog from "@/components/PlanChangeDialog"
import { formatPlanDate, usePlanChange } from "@/components/usePlanChange"
import type { PlanId } from "@/lib/pricing-plans"

const INTERVALS: { id: BillingInterval; label: string; hint?: string }[] = [
  { id: "monthly", label: "Mensual" },
  { id: "annual", label: "Anual", hint: "2 meses gratis" },
]

/*
 * The same three cards for monthly and annual billing. Buy buttons open the
 * shared Stripe Checkout with the selected plan and interval, for plans that
 * can be bought (see isPlanCheckoutReady); the rest stay "Disponible muy pronto".
 *
 * A signed-in subscriber sees the same cards in terms of their plan, as the
 * server read it from Stripe: "Plan actual", "Cambiar a" for lower plans (a
 * downgrade scheduled for the end of the paid period) and "Mejorar a" for
 * higher ones (an immediate, paid upgrade to a new monthly period). If the server
 * cannot say whether the user subscribes, nothing can be bought until a retry.
 */
export default function PricingPlans({ initialInterval = "monthly" }: { initialInterval?: BillingInterval }) {
  const [interval, setBillingInterval] = useState<BillingInterval>(initialInterval)
  const checkout = useStripeCheckout("/api/stripe/checkout")
  useCheckoutCanceledNotice()
  const planChange = usePlanChange()
  const [changeTarget, setChangeTarget] = useState<PlanId | null>(null)
  const [changeMode, setChangeMode] = useState<"downgrade" | "upgrade">("downgrade")
  const { previewUpgrade, upgrade, waitForUpgrade } = planChange
  const upgradeApi = useMemo(() => ({ previewUpgrade, upgrade, waitForUpgrade }), [previewUpgrade, upgrade, waitForUpgrade])
  const openChange = (planId: PlanId, mode: "downgrade" | "upgrade") => { setChangeMode(mode); setChangeTarget(planId) }
  const subscription = planChange.load === "ready" ? planChange.state?.subscription ?? null : null
  const pending = planChange.state?.pending ?? null

  // Show a subscriber their own billing interval first, once.
  const intervalSynced = useRef(false)
  useEffect(() => {
    if (subscription && !intervalSynced.current) {
      intervalSynced.current = true
      setBillingInterval(subscription.interval)
    }
  }, [subscription])

  const subscriberAction = (planId: PlanId, name: string, featured: boolean): ReactNode => {
    if (!subscription) return null
    const cta = `${styles.cta} ${featured ? styles.ctaFeatured : ""}`
    const disabled = (label: string, note?: string) => (
      <>
        <button type="button" disabled className={cta}>{label}</button>
        {note && <p className={styles.ctaNote}>{note}</p>}
      </>
    )
    const rank = SUBSCRIPTION_PLANS.findIndex((plan) => plan.id === planId) - SUBSCRIPTION_PLANS.findIndex((plan) => plan.id === subscription.plan)
    const otherInterval = interval === "annual" ? "anual" : "mensual"

    if (interval !== subscription.interval) {
      return disabled(rank === 0 ? `${name} ${otherInterval}` : rank < 0 ? `Cambiar a ${name}` : `Mejorar a ${name}`,
        `El cambio a facturación ${otherInterval} todavía no está disponible.`)
    }
    if (rank === 0) {
      return disabled("Plan actual",
        subscription.cancelAtPeriodEnd ? `Tu suscripción termina el ${formatPlanDate(subscription.periodEnd)}.`
          : pending?.plan ? `Lo conservas hasta el ${formatPlanDate(pending.effectiveAt)}.` : undefined)
    }
    if (rank > 0) {
      const payment = planChange.state?.pendingPayment
      if (payment?.plan === planId && payment.invoiceUrl) {
        return (
          <>
            <a className={cta} href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">Completar el pago</a>
            <p className={styles.ctaNote}>Tu banco pidió confirmar el pago de {name}. Hasta entonces sigues en tu plan actual.</p>
          </>
        )
      }
      if (payment) return disabled(`Mejorar a ${name}`, "Tienes otra mejora pendiente de pago.")
      if (subscription.interval === "annual") return disabled(`Mejorar a ${name}`, "La mejora de planes anuales estará disponible muy pronto.")
      if (pending) return disabled(`Mejorar a ${name}`, "Anula el cambio programado en Configuración para poder mejorar.")
      if (!planChange.state?.upgrades.includes(planId)) {
        return disabled(`Mejorar a ${name}`, subscription.cancelAtPeriodEnd
          ? "Reactiva tu suscripción en el portal para poder mejorar."
          : "Esta mejora no está disponible ahora.")
      }
      return (
        <>
          <button type="button" className={cta} disabled={Boolean(planChange.busy)} onClick={() => openChange(planId, "upgrade")}>
            Mejorar a {name}
          </button>
          <p className={styles.ctaNote}>Se cobra hoy y empieza un nuevo período.</p>
        </>
      )
    }
    if (pending?.plan === planId) return disabled("Cambio programado", `Desde el ${formatPlanDate(pending.effectiveAt)}.`)
    if (!planChange.state?.downgrades.includes(planId)) {
      return disabled(`Cambiar a ${name}`, subscription.cancelAtPeriodEnd
        ? "No disponible mientras tu suscripción está programada para cancelarse."
        : "Este cambio no está disponible ahora.")
    }
    return (
      <>
        <button type="button" className={cta} disabled={Boolean(planChange.busy)} onClick={() => openChange(planId, "downgrade")}>
          Cambiar a {name}
        </button>
        <p className={styles.ctaNote}>Al terminar tu período actual. Hoy no se cobra nada.</p>
      </>
    )
  }

  return (
    <>
      <div className={styles.billingToggle} role="group" aria-label="Periodo de facturación">
        {INTERVALS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={interval === option.id}
            disabled={Boolean(checkout.pending)}
            onClick={() => setBillingInterval(option.id)}
          >
            {option.label}
            {option.hint && <span>{option.hint}</span>}
          </button>
        ))}
      </div>

      {planChange.load === "error" && (
        <div className={styles.loadError} role="alert">
          <p>No pudimos comprobar tu suscripción. Para evitar un cobro duplicado, los planes no están disponibles hasta que lo volvamos a intentar.</p>
          <button type="button" onClick={() => void planChange.reload()}>Reintentar</button>
        </div>
      )}

      <div className={styles.grid}>
        {SUBSCRIPTION_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`${styles.card} ${plan.recommended ? styles.featured : ""}`}
          >
            <span className={styles.cardLight} aria-hidden="true" />

            {plan.recommended && (
              <span className={styles.popular}><i aria-hidden="true" />Recomendado</span>
            )}

            <header className={styles.cardHead}>
              <h3>{plan.name}</h3>
              {subscription?.plan === plan.id && <span className={styles.currentBadge}>PLAN ACTUAL</span>}
            </header>

            <p className={styles.audience}>{plan.audience}</p>

            <div className={styles.price}>
              <strong>{formatPrice(interval === "annual" ? plan.annualPrice : plan.monthlyPrice)}</strong>
              <span className={styles.priceMeta}>{interval === "annual" ? "USD / año" : "USD / mes"}</span>
            </div>

            {plan.note && <p className={styles.planEdge}>{plan.note}</p>}

            <p className={styles.credits}>
              <span className={styles.creditToken} aria-hidden="true"><i /><i /><i /><i /></span>
              {plan.monthlyCredits} créditos / mes
            </p>

            <p className={styles.outcome}>
              {planOutcome(plan)}
              {plan.adKits && <span> Unos {Math.floor(plan.monthlyCredits / (CREDIT_COST.video + 4 * CREDIT_COST.image))} kits de anuncio (1 Video Rápido + 4 imágenes).</span>}
            </p>

            <div className={styles.divider} />

            <ul className={styles.features}>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className={styles.check} aria-hidden="true">
                    <svg width={12} height={12} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            {plan.creditRule && <p className={styles.creditRule}>{plan.creditRule}</p>}

            {planChange.load === "error" ? (
              <button type="button" disabled className={`${styles.cta} ${plan.recommended ? styles.ctaFeatured : ""}`}>No disponible ahora</button>
            ) : subscription ? (
              <div className={styles.ctaGroup}>{subscriberAction(plan.id, plan.name, Boolean(plan.recommended))}</div>
            ) : isPlanCheckoutReady(plan.id, interval) ? (
              <button
                type="button"
                // Until the server says whether this user already subscribes, nothing opens.
                disabled={Boolean(checkout.pending) || planChange.load === "loading"}
                aria-busy={checkout.pending === plan.id}
                onClick={() => void checkout.start(plan.id, { plan: plan.id, interval })}
                className={`${styles.cta} ${plan.recommended ? styles.ctaFeatured : ""}`}
              >
                {checkout.pending === plan.id ? "Abriendo Checkout..." : `Elegir ${plan.name}`}
              </button>
            ) : (
              <button type="button" disabled className={`${styles.cta} ${plan.recommended ? styles.ctaFeatured : ""}`}>
                Disponible muy pronto
              </button>
            )}
          </article>
        ))}
      </div>

      <PlanChangeDialog
        target={changeTarget}
        mode={changeMode}
        state={planChange.state}
        busy={planChange.busy === "schedule" || planChange.busy === "upgrade"}
        onConfirm={planChange.schedule}
        upgradeApi={upgradeApi}
        onClose={() => setChangeTarget(null)}
      />

      <aside className={styles.explainer} aria-label="Cómo funcionan los créditos">
        <div>
          <h3>Dos niveles de video. Tú eliges cómo invertir tus créditos.</h3>
          <p>Todos los planes incluyen Video Rápido y Video Premium. Usa menos créditos para crear más variaciones o elige Premium para un acabado más detallado.</p>
        </div>
        <ul>{CREDIT_RATES.map((rate) => <li key={rate}>{rate}</li>)}</ul>
      </aside>
    </>
  )
}
