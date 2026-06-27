import Link from "next/link"
import Image from "next/image"
import Spotlight from "@/components/Spotlight"
import MeshGradient from "@/components/MeshGradient"
import GeometricBackground from "@/components/GeometricBackground"
import ParticleCanvas from "@/components/ParticleCanvas"
import PricingButton from "@/components/PricingButton"

const bentoCards = [
  {
    title: "4 Ángulos Visuales Estáticos",
    description: "Interrupción de Patrón, Beneficio Crudo, Falso Nativo y Oferta Directa. Cada uno optimizado para detener el scroll y generar clics.",
    icon: (
      <svg className="w-6 h-6" width={24} height={24} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Diseño de Alto Contraste",
    description: "Creativos estáticos con tipografía de impacto, composición agresiva y jerarquía visual pensada para pantallas móviles.",
    icon: (
      <svg className="w-6 h-6" width={24} height={24} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    title: "Creativos Estáticos en 10 Minutos",
    description: "De la idea a la imagen final lista para Meta Ads. Sin video, sin motion, sin complicaciones. Solo imágenes que convierten.",
    icon: (
      <svg className="w-6 h-6" width={24} height={24} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
]

const creativePack = [
  { angle: "Interrupción de Patrón", icon: "⚡", ctr: "Alto" },
  { angle: "Beneficio Crudo", icon: "◎", ctr: "Medio" },
  { angle: "Oferta Directa", icon: "🔥", ctr: "Muy Alto" },
]

const steps = [
  {
    number: "01",
    title: "Describe tu producto",
    description: "Ingresa qué estás vendiendo en una línea. Sin briefs largos, sin reuniones.",
    icon: (
      <svg width={56} height={56} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Elige tu estrategia",
    description: "Selecciona el ángulo de venta, estilo visual y formato. La IA hace el resto.",
    icon: (
      <svg width={56} height={56} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Descarga y publica",
    description: "Tu creativo listo para Meta Ads en segundos. Sin diseñadores, sin esperas.",
    icon: (
      <svg width={56} height={56} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
]

const plans = [
  {
    name: "Starter",
    variantId: "1842724",
    originalPrice: "$9.99",
    price: "$5.99",
    period: "/mes",
    credits: "40 créditos/mes",
    description: "Ideal para negocios locales",
    highlighted: false,
    features: [
      "40 créditos/mes",
      "1 crédito = 1 creativo",
      "3 formatos (1:1, 4:5, 9:16)",
      "4 ángulos de venta",
      "Soporte por email"
    ],
  },
  {
    name: "Pro",
    variantId: "1842974",
    originalPrice: "$24.99",
    price: "$19.99",
    period: "/mes",
    credits: "150 créditos/mes",
    description: "Ideal para agencias",
    highlighted: true,
    features: [
      "150 créditos/mes",
      "1 crédito = 1 creativo",
      "Todos los formatos y estilos",
      "4 ángulos de venta",
      "Historial de campañas",
      "Soporte prioritario"
    ],
  },
  {
    name: "Business",
    variantId: "1842976",
    originalPrice: "$59.99",
    price: "$49.99",
    period: "/mes",
    credits: "500 créditos/mes",
    description: "Para Media Buyers",
    highlighted: false,
    features: [
      "500 créditos/mes",
      "1 crédito = 1 creativo",
      "Todo lo del plan Pro",
      "White label",
      "API access",
      "Soporte 24/7",
      "Múltiples usuarios"
    ],
  },
]

export default function Home() {
  return (
    <main className="min-h-screen text-[#E8E6E1] relative z-[1] overflow-hidden">
      <ParticleCanvas />
      <MeshGradient />
      <GeometricBackground />
      <Spotlight />

      <header
        className="fixed top-4 left-0 right-0 z-50 mx-auto flex items-center justify-between"
        style={{
          maxWidth: "900px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "9999px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          padding: "12px 24px",
        }}
      >
        <div className="flex items-center gap-3">
          <Image src="/logo_PixelOS.png" width={44} height={44} alt="PixelOS" priority unoptimized />
          <span className="font-semibold text-[#E8E6E1] tracking-tight text-xl">
            PixelOS
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#pricing" className="text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors">
            Precios
          </a>
          <Link
            href="/login"
            className="text-sm font-medium px-5 py-2.5 rounded-xl border border-[#3A3833]/50 hover:border-[#D97757]/50 hover:bg-[#2A2826]/50 transition-all duration-200 backdrop-blur-sm"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <section className="hero-bg border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A2826]/60 backdrop-blur-md border border-[#3A3833]/50 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
              <span className="text-xs font-medium text-[#9A9893]">
                Motor de Imágenes Publicitarias con IA
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 text-[#E8E6E1]">
              Imágenes publicitarias que multiplican tus ventas en minutos.
            </h1>

            <p className="text-lg md:text-xl text-[#9A9893] max-w-2xl mb-10 leading-relaxed">
              Dile adiós a los diseñadores lentos. Ingresa tu producto, elige un ángulo de venta y deja que la IA genere creativos de alto impacto listos para subir a tus campañas de Meta Ads.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 bg-[#D97757] text-white font-semibold text-base px-8 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/30"
              >
                <span>Generar creativos ahora</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#bento"
                className="inline-flex items-center gap-2 text-[#E8E6E1] font-medium text-base px-8 py-4 rounded-xl border border-[#3A3833]/50 hover:border-[#D97757]/50 hover:bg-[#2A2826]/50 transition-all duration-200 backdrop-blur-sm"
              >
                Ver demostración
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Cómo Funciona */}
      <section className="relative border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#E8E6E1] mb-3">
              3 pasos. Un creativo.
            </h2>
            <p className="text-lg text-[#9A9893]">
              Así de simple.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="group relative flex flex-col items-center text-center p-8 rounded-2xl transition-colors duration-300 hover:border-[#D97757]/40"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(232,114,74,0.15)",
                }}
              >
                <span className="absolute top-4 left-5 text-xs font-semibold text-[#D97757] tracking-widest">
                  {step.number}
                </span>
                <div className="mt-6 mb-5 text-[#D97757] transition-transform duration-300 group-hover:scale-110">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-[#E8E6E1] mb-3">{step.title}</h3>
                <p className="text-[#9A9893] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección Ejemplos de Creativos */}
      <section className="relative border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#E8E6E1] mb-3">
              Creativos generados con PixelOS
            </h2>
            <p className="text-lg text-[#9A9893]">
              Reales. Generados en segundos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-[#3A3833]/50 hover:border-[#D97757]/40 transition-all duration-300">
              <img
                src="https://masacsnqilcqlzxhtohi.supabase.co/storage/v1/object/public/creativos/creativo_93.jpg"
                alt="Creativo generado - Escasez y Urgencia"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent">
                <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-[#D97757]/90 text-white backdrop-blur-sm">
                  Escasez y Urgencia
                </span>
              </div>
            </div>

            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-[#3A3833]/50 hover:border-[#D97757]/40 transition-all duration-300">
              <img
                src="/creativo_97.jpg"
                alt="Creativo generado - Demostración de Producto"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent">
                <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-[#D97757]/90 text-white backdrop-blur-sm">
                  Demostración de Producto
                </span>
              </div>
            </div>

            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-[#3A3833]/50 hover:border-[#D97757]/40 transition-all duration-300">
              <img
                src="/creativo_106.jpg"
                alt="Creativo generado - Lifestyle & Contexto"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent">
                <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-[#D97757]/90 text-white backdrop-blur-sm">
                  Lifestyle & Contexto
                </span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[#D97757] font-semibold text-base hover:text-[#C26547] transition-colors"
            >
              Genera el tuyo ahora
              <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div className="bg-[#2A2826]/60 backdrop-blur-md rounded-2xl border border-[#3A3833]/50 overflow-hidden">
            <div className="bg-[#1E1C1A]/80 backdrop-blur-md border-b border-[#3A3833]/50 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#3A3833]" />
                <div className="w-3 h-3 rounded-full bg-[#3A3833]" />
                <div className="w-3 h-3 rounded-full bg-[#3A3833]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-lg bg-[#2A2826]/60 backdrop-blur-sm border border-[#3A3833]/50 text-xs text-[#9A9893]">
                  app.afmestudio.com/dashboard
                </div>
              </div>
            </div>

            <div className="p-8 lg:p-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-[#E8E6E1] mb-1">Pack de Creativos Generados</p>
                  <p className="text-xs text-[#9A9893]">3 ángulos · Estilo Fotografía Realista · 1:1</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-400">Listo para publicar</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creativePack.map((creative, idx) => (
                  <div key={idx} className="aspect-square bg-[#1E1C1A]/60 backdrop-blur-sm rounded-xl border border-[#3A3833]/50 flex items-center justify-center hover:border-[#D97757]/40 transition-colors">
                    <div className="text-center">
                      <span className="text-5xl mb-3 block">{creative.icon}</span>
                      <p className="text-sm font-bold text-[#E8E6E1] mb-1">{creative.angle}</p>
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30">
                        CTR: {creative.ctr}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="bento" className="relative border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#E8E6E1] mb-3">
              El Bento Box del Marketing
            </h2>
            <p className="text-lg text-[#9A9893]">
              Generación de creativos estáticos optimizados para Meta Ads
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-[#3A3833]/50 rounded-2xl overflow-hidden bg-[#2A2826]/40 backdrop-blur-md">
            {bentoCards.map((card, idx) => (
              <div
                key={idx}
                className={`p-8 bg-[#2A2826]/40 backdrop-blur-sm ${
                  idx < bentoCards.length - 1 ? 'md:border-r border-[#3A3833]/50' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E1C1A]/60 backdrop-blur-sm border border-[#3A3833]/50 flex items-center justify-center text-[#D97757] mb-6">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-[#E8E6E1] mb-3">{card.title}</h3>
                <p className="text-[#9A9893] leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#E8E6E1] mb-3">
              Planes simples
            </h2>
            <p className="text-lg text-[#9A9893]">
              Precios de lanzamiento. Sin contratos. Cancela cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 backdrop-blur-md ${
                  plan.highlighted
                    ? "border-[#D97757] bg-[#2A2826]/60 shadow-lg shadow-[#D97757]/20"
                    : "border-[#3A3833]/50 bg-[#2A2826]/40 hover:border-[#D97757]/40"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D97757] text-white text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Más popular
                  </span>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-[#E8E6E1] mb-2">{plan.name}</h3>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#9A9893] text-lg line-through">{plan.originalPrice}</span>
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30">
                      Precio MVP
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-[#E8E6E1]">{plan.price}</span>
                    <span className="text-[#9A9893] text-sm">{plan.period}</span>
                  </div>
                  <p className="text-[#D97757] text-sm font-semibold mt-3">{plan.credits}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-[#9A9893]">
                      <svg className="w-4 h-4 text-[#D97757] flex-shrink-0" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <PricingButton
                  variantId={plan.variantId}
                  planName={plan.name}
                  highlighted={plan.highlighted}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-b border-[#3A3833]/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="bg-[#2A2826]/60 backdrop-blur-md rounded-2xl border border-[#3A3833]/50 p-12 lg:p-20 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#E8E6E1] mb-6">
              Deja de perder tiempo en diseño.
              <br />
              <span className="text-[#D97757]">Empieza a escalar.</span>
            </h2>
            <p className="text-lg text-[#9A9893] max-w-2xl mx-auto mb-10">
              Únete a cientos de Media Buyers y agencias que ya están generando imágenes publicitarias con IA.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#D97757] text-white font-semibold text-base px-8 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/30"
            >
              Comenzar ahora
              <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center">
                <span className="text-white font-bold text-xs">AFM</span>
              </div>
              <span className="text-sm text-[#9A9893]">AFM Estudio</span>
            </div>
            <span className="text-xs text-[#9A9893]/60">
              © 2026 AFM Estudio · PixelOS
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
