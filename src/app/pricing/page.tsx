import Image from "next/image"
import Link from "next/link"
import PricingPlans from "@/components/PricingPlans"

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#1E1C1A] text-[#E8E6E1]">
      <header className="border-b border-[#3A3833]/50 bg-[#1E1C1A]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo_PixelOS.png" width={44} height={44} alt="PixelOS" priority unoptimized />
            <span className="font-semibold text-xl tracking-tight">PixelOS</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors">
            <svg className="w-4 h-4" width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </header>

      <section className="relative px-6 lg:px-10 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Planes simples</h1>
            <p className="text-lg text-[#9A9893]">Precios de lanzamiento. Sin contratos. Cancela cuando quieras.</p>
          </div>
          <PricingPlans />
        </div>
      </section>
    </main>
  )
}
