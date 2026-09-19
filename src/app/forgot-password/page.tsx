"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [linkError, setLinkError] = useState(false)

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error")
    setLinkError(error === "invalid_or_expired")
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/recovery/callback`,
      })
    } catch {
      // Se conserva la misma respuesta para no revelar si el correo existe.
    } finally {
      // La respuesta es deliberadamente idéntica exista o no la cuenta.
      setSubmitted(true)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#1E1C1A]">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors mb-12 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio de sesión
        </Link>

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-8">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mb-5 text-[#D97757]">
              <svg width={22} height={22} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 7a4 4 0 1 1-7.75 1.38L3 12.63V16h3v3h3v2h3.37l3.25-3.25A4 4 0 0 1 15 7Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17.5 9.5h.01" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#E8E6E1] mb-2">Recupera tu contraseña</h1>
            <p className="text-[#9A9893] leading-relaxed">
              Escribe el correo asociado a tu cuenta y te enviaremos un enlace seguro.
            </p>
          </div>

          {linkError && !submitted && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20" role="alert">
              <p className="text-amber-300 text-sm">
                El enlace es inválido o ha expirado. Solicita uno nuevo para continuar.
              </p>
            </div>
          )}

          {submitted ? (
            <div aria-live="polite">
              <div className="px-4 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <p className="text-emerald-300 text-sm leading-relaxed">
                  Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="w-full bg-[#1E1C1A] border border-[#3A3833] text-[#E8E6E1] font-semibold px-6 py-4 rounded-xl hover:border-[#D97757]/40 transition-colors"
              >
                Enviar a otro correo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3.5 rounded-xl text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                  placeholder="tu@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D97757] text-white font-semibold px-6 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
