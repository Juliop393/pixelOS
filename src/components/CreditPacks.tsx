"use client"

import { CREDIT_PACKS, CREDIT_PACK_RULES, CREDIT_RATES, formatPrice, videosFor, type CreditPack } from "@/lib/pricing-plans"
import { useStripePackCheckout } from "@/components/useStripePackCheckout"
import styles from "@/components/PricingPlans.module.css"

/**
 * Purchase stays disabled until a handler is passed in, or while Stripe is in
 * test mode, until the test access (?stripe_test=1) turns on the shared handler.
 */
export default function CreditPacks({ onPurchase }: { onPurchase?: (pack: CreditPack) => void }) {
  const testCheckout = useStripePackCheckout()
  const purchase = onPurchase ?? testCheckout.purchase
  const pending = testCheckout.pendingPack

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
              disabled={!purchase || Boolean(pending)}
              aria-busy={pending === pack.id}
              onClick={() => purchase?.(pack)}
              className={`${styles.cta} ${pack.emphasized ? styles.ctaFeatured : ""}`}
            >
              {!purchase
                ? "Disponible muy pronto"
                : pending === pack.id
                  ? "Abriendo Checkout..."
                  : `Comprar ${pack.credits} créditos`}
            </button>
          </article>
        ))}
      </div>

      {testCheckout.enabled && !onPurchase && (testCheckout.error || testCheckout.notice) && (
        <p className={styles.packRules} role={testCheckout.error ? "alert" : "status"}>
          {testCheckout.error || testCheckout.notice}
        </p>
      )}
      <p className={styles.packRates}>{CREDIT_RATES.join(" · ")}</p>
      <p className={styles.packRules}>
        Disponibles para suscriptores · Duran {CREDIT_PACK_RULES.validityMonths} meses · Acumulables · No se pierden si cancelas
        {testCheckout.enabled && !onPurchase ? " · Modo prueba: no se cobra dinero real ni se agregan créditos" : ""}
      </p>
    </>
  )
}
