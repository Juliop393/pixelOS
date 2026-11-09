"use client"

import { useState } from "react"
import { CREDIT_RATES, SUBSCRIPTION_PLANS, formatPrice, isPlanCheckoutReady, planOutcome, type BillingInterval } from "@/lib/pricing-plans"
import { useCheckoutCanceledNotice, useStripeCheckout } from "@/components/useStripeCheckout"
import styles from "@/components/PricingPlans.module.css"

const INTERVALS: { id: BillingInterval; label: string; hint?: string }[] = [
  { id: "monthly", label: "Mensual" },
  { id: "annual", label: "Anual", hint: "2 meses gratis" },
]

/*
 * The same three cards for monthly and annual billing. Buy buttons open the
 * shared Stripe Checkout with the selected plan and interval, for plans that
 * can be bought (see isPlanCheckoutReady); the rest stay "Disponible muy pronto".
 */
export default function PricingPlans({ initialInterval = "monthly" }: { initialInterval?: BillingInterval }) {
  const [interval, setBillingInterval] = useState<BillingInterval>(initialInterval)
  const checkout = useStripeCheckout("/api/stripe/checkout")
  useCheckoutCanceledNotice()

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
              {plan.adKits && <span> Unos {plan.adKits} kits de anuncio (1 video + 4 imágenes).</span>}
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

            {isPlanCheckoutReady(plan.id, interval) ? (
              <button
                type="button"
                disabled={Boolean(checkout.pending)}
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

      <aside className={styles.explainer} aria-label="Cómo funcionan los créditos">
        <div>
          <h3>Un solo saldo para imágenes y videos.</h3>
          <p>Úsalos como quieras: imagen, video o una combinación de ambos.</p>
        </div>
        <ul>{CREDIT_RATES.map((rate) => <li key={rate}>{rate}</li>)}</ul>
      </aside>
    </>
  )
}
