import Image from "next/image"
import Link from "next/link"

interface LegalPageProps {
  title: string
  updatedAt: string
  children: React.ReactNode
}

export function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#111111] text-[#E8E6E1]">
      <header
        className="fixed top-4 left-4 right-4 z-50 mx-auto flex items-center justify-between"
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
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo_PixelOS.png" width={44} height={44} alt="PixelFM" priority unoptimized />
          <span className="font-semibold text-[#E8E6E1] tracking-tight text-xl">PixelFM</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors"
        >
          <svg className="w-4 h-4" width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>
      </header>

      <article className="max-w-3xl mx-auto px-6 pt-36 pb-20">
        <div className="mb-12 border-b border-[#3A3833] pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D97757] mb-4">
            Información legal
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">{title}</h1>
          <p className="text-sm text-[#9A9893] mt-4">Última actualización: {updatedAt}</p>
        </div>

        <div className="space-y-10 text-[#C7C4BE] leading-7 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#E8E6E1] [&_h2]:mb-3 [&_p]:mb-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:marker:text-[#D97757]">
          {children}
        </div>
      </article>
    </main>
  )
}
