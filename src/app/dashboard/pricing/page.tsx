import PricingPlans from "@/components/PricingPlans"

export default function DashboardPricingPage() {
  return (
    <section className="max-w-6xl mx-auto py-8">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#E8E6E1] mb-3">
          Recarga tus créditos
        </h2>
        <p className="text-lg text-[#9A9893]">
          Elige el plan que mejor acompañe el ritmo de tus campañas.
        </p>
      </div>
      <PricingPlans />
    </section>
  )
}
