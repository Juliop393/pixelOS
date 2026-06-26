import Image from "next/image"
import Link from "next/link"

export default function MobileBlock() {
  return (
    <div className="md:hidden min-h-screen bg-[#1E1C1A] text-[#E8E6E1] flex flex-col items-center justify-center px-8 text-center">
      <Image
        src="/logo_PixelOS.png"
        width={64}
        height={64}
        alt="PixelOS"
        unoptimized
      />

      <h1 className="mt-8 text-2xl font-bold tracking-tight">
        PixelOS está optimizado para desktop
      </h1>

      <p className="mt-4 text-[#9A9893] leading-relaxed max-w-sm">
        Para la mejor experiencia, accede desde tu computadora o laptop.
      </p>

      <p className="mt-2 text-[#9A9893]/70 text-sm leading-relaxed max-w-sm">
        La landing page sí está disponible en móvil.
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
      >
        Ver más información
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}