"use client"

import { CREDIT_PACKS, CREDIT_PACK_RULES, CREDIT_RATES, formatPrice, videosFor, type CreditPack } from "@/lib/pricing-plans"
import { useCheckoutCanceledNotice, useStripeCheckout } from "@/components/useStripeCheckout"
import styles from "@/components/PricingPlans.module.css"

/** Buy buttons open the shared Stripe Checkout unless a handler is passed in. `locked` shows the packs without a way to buy them. */
export default function CreditPacks({ onPurchase, locked = false }: { onPurchase?: (pack: CreditPack) => void; locked?: boolean }) {
  const checkout = useStripeCheckout("/api/stripe/packs/checkout")
  useCheckoutCanceledNotice()
  const purchase = onPurchase ?? ((pack: CreditPack) => void checkout.start(pack.id, { pack: pack.id }))
  const pending = checkout.pending

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
            <p className={styles.packOutcome}>≈ {videosFor(pack.credits)} videos en Video Rápido</p>
            <button
              type="button"
              disabled={locked || Boolean(pending)}
              aria-busy={pending === pack.id}
              onClick={() => { if (!locked) purchase(pack) }}
              className={`${styles.cta} ${pack.emphasized ? styles.ctaFeatured : ""}`}
            >
              {locked ? "Disponible con una suscripción activa" : pending === pack.id ? "Abriendo Checkout..." : `Comprar ${pack.credits} créditos`}
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
