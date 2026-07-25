"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#1E1C1A]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors mb-12 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#D97757]" width={32} height={32} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#E8E6E1] mb-3">
            Confirma tu correo
          </h1>

          <p className="text-[#9A9893] mb-4 leading-relaxed">
            Te enviamos un enlace de confirmación para activar tu cuenta de PixelFM.
          </p>

          {email && (
            <p className="text-sm text-[#D97757] font-medium mb-4 bg-[#D97757]/5 py-2 px-4 rounded-lg inline-block">
              Enviado a: {email}
            </p>
          )}

          <p className="text-xs text-[#9A9893]/70 mb-8 leading-relaxed">
            Revisa tu bandeja de entrada y también la carpeta de spam.
            Después de confirmar tu correo, podrás iniciar sesión.
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-[#D97757] text-white font-semibold px-6 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
            >
              Ir a iniciar sesión
            </Link>

            <Link
              href="/register"
              className="block w-full text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors py-2"
            >
              Usar otro correo
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
