import PricingButton from "@/components/PricingButton"
import { pricingPlans } from "@/lib/pricing-plans"
import styles from "@/components/PricingPlans.module.css"

export default function PricingPlans() {
  return (
    <div className={styles.grid}>
      {pricingPlans.map((plan) => (
        <article
          key={plan.name}
          className={`${styles.card} ${plan.highlighted ? styles.featured : ""}`}
        >
          <span className={styles.cardLight} aria-hidden="true" />

          {plan.highlighted && (
            <span className={styles.popular}><i aria-hidden="true" />Más popular</span>
          )}

          <header className={styles.cardHead}>
            <h3>{plan.name}</h3>
            <span className={styles.mvp}>Precio MVP</span>
          </header>

          <div className={styles.price}>
            <strong>{plan.price}</strong>
            <span className={styles.priceMeta}>
              <s className={styles.priceOld}>{plan.originalPrice}</s>
              <span>USD / mes</span>
            </span>
          </div>

          <p className={styles.credits}>
            <span className={styles.creditToken} aria-hidden="true"><i /><i /><i /><i /></span>
            {plan.credits}
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

          <PricingButton
            priceId={plan.priceId}
            planName={plan.name}
            highlighted={plan.highlighted}
          />
        </article>
      ))}
    </div>
  )
}
