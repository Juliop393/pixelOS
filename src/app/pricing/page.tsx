import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import PricingPlans from "@/components/PricingPlans"
import styles from "@/components/PricingPlans.module.css"

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <span className={styles.backdrop} aria-hidden="true" />

      <header className="navShell">
        <nav className={`nav glass ${styles.nav}`} aria-label="Navegación">
          <Link className="logo" href="/">
            <img className="logoMark" src="/pixelfm-logo.png" alt="" aria-hidden="true" />
            <span>Pixel<span>FM</span></span>
          </Link>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            Volver al dashboard
          </Link>
        </nav>
      </header>

      <section className={styles.section}>
        <div className={styles.hero}>
          <span className={styles.kicker}><i aria-hidden="true" />PRECIOS</span>
          <h2>Planes <em>simples</em></h2>
          <p>Todas las funciones en todos los planes. Solo eliges cuánto quieres producir.</p>
        </div>

        <PricingPlans />

        <p className={styles.note}>
          <span><Check aria-hidden="true" />Cancela cuando quieras</span>
          <i aria-hidden="true" />
          <span>¿Necesitas más? Añade packs a tu saldo sin cambiar de plan</span>
        </p>
      </section>
    </main>
  )
}
