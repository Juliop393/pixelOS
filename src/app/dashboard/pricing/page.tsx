import CreditPacks from "@/components/CreditPacks"
import PricingPlans from "@/components/PricingPlans"
import styles from "@/components/PricingPlans.module.css"
import StripeCheckoutTest from "@/components/dashboard/StripeCheckoutTest"

export default function DashboardPricingPage() {
  return (
    <section id="dashboard-pricing" className={styles.dashboardSection}>
      <div className={styles.hero}>
        <span className={styles.kicker}><i aria-hidden="true" />PLANES</span>
        <h1>Planes y créditos</h1>
        <p>Elige el plan que acompañe el ritmo de tus campañas.</p>
      </div>
      <StripeCheckoutTest />
      <PricingPlans />

      <section id="recargar" className={styles.packsSection} aria-labelledby="packs-title">
        <header className={styles.packsHead}>
          <span className={styles.kicker}><i aria-hidden="true" />RECARGAR</span>
          <h2 id="packs-title">Añade créditos a tu saldo</h2>
          <p>Sin cambiar de plan. Sirven igual para imágenes y videos.</p>
        </header>
        <CreditPacks />
      </section>
    </section>
  )
}
