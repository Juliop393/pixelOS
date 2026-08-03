import Link from "next/link"
import PricingPlans from "@/components/PricingPlans"

export default function PricingPage() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--cream)" }}>
      <header className="navShell">
        <nav className="nav glass" aria-label="Navegación">
          <Link className="logo" href="/">
            <img className="logoMark" src="/pixelfm-logo.png" alt="" aria-hidden="true" />
            <span>Pixel<span>FM</span></span>
          </Link>
          <Link href="/dashboard" className="login text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors">
            ← Volver al dashboard
          </Link>
        </nav>
      </header>

      <section className="container" style={{ marginTop: "80px", paddingBottom: "120px" }}>
        <div className="sectionIntro centered">
          <span className="kicker">PRECIOS</span>
          <h2>Planes simples</h2>
          <p>Precios de lanzamiento. Sin contratos. Cancela cuando quieras.</p>
        </div>
        <PricingPlans />
        <p className="pricingNote" style={{ marginTop: "32px" }}>✓ Cancela cuando quieras · Los créditos se renuevan cada mes</p>
      </section>
    </main>
  )
}