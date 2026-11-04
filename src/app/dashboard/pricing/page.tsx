import PricingPlans from "@/components/PricingPlans"
import styles from "@/components/PricingPlans.module.css"

export default function DashboardPricingPage() {
  return (
    <section className={styles.dashboardSection}>
      <div className={styles.hero}>
        <span className={styles.kicker}><i aria-hidden="true" />CRÉDITOS</span>
        <h1>Recarga tus créditos</h1>
        <p>Elige el plan que mejor acompañe el ritmo de tus campañas.</p>
      </div>
      <PricingPlans />
    </section>
  )
}
