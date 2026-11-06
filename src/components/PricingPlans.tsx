import { CREDIT_RATES, SUBSCRIPTION_PLANS, formatPrice, planOutcome } from "@/lib/pricing-plans"
import styles from "@/components/PricingPlans.module.css"

export default function PricingPlans() {
  return (
    <>
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
              <strong>{formatPrice(plan.monthlyPrice)}</strong>
              <span className={styles.priceMeta}>USD / mes</span>
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

            <button
              type="button"
              disabled
              className={`${styles.cta} ${plan.recommended ? styles.ctaFeatured : ""}`}
            >
              Disponible muy pronto
            </button>
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
