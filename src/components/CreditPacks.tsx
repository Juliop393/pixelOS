"use client"

import { CREDIT_PACKS, CREDIT_PACK_RULES, CREDIT_RATES, formatPrice, videosFor, type CreditPack } from "@/lib/pricing-plans"
import styles from "@/components/PricingPlans.module.css"

/** Purchase stays disabled until a handler is passed in. */
export default function CreditPacks({ onPurchase }: { onPurchase?: (pack: CreditPack) => void }) {
  return (
    <>
      <div className={styles.packs}>
        {CREDIT_PACKS.map((pack) => (
          <article key={pack.id} className={`${styles.pack} ${pack.emphasized ? styles.packEmphasized : ""}`}>
            <p className={styles.packCredits}>
              <span className={styles.creditToken} aria-hidden="true"><i /><i /><i /><i /></span>
              {pack.credits} créditos
            </p>
            <strong className={styles.packPrice}>{formatPrice(pack.price)}</strong>
            <p className={styles.packTagline}>{pack.tagline}</p>
            <p className={styles.packOutcome}>≈ {videosFor(pack.credits)} videos</p>
            <button
              type="button"
              disabled={!onPurchase}
              onClick={() => onPurchase?.(pack)}
              className={`${styles.cta} ${pack.emphasized ? styles.ctaFeatured : ""}`}
            >
              {onPurchase ? `Comprar ${pack.credits} créditos` : "Disponible muy pronto"}
            </button>
          </article>
        ))}
      </div>

      <p className={styles.packRates}>{CREDIT_RATES.join(" · ")}</p>
      <p className={styles.packRules}>
        Disponibles para suscriptores · Duran {CREDIT_PACK_RULES.validityMonths} meses · Acumulables · No se pierden si cancelas
      </p>
    </>
  )
}
