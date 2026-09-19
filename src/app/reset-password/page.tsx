"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "bg-[#3A3833]" }

  let score = password.length >= 8 ? 1 : 0
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  if (score >= 3) return { score, label: "Fuerte", color: "bg-emerald-400" }
  if (score === 2) return { score, label: "Media", color: "bg-amber-400" }
  return { score: Math.max(score, 1), label: "Débil", color: "bg-red-400" }
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [checkingSession, setCheckingSession] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    const validateRecoverySession = async () => {
      const queryError = new URLSearchParams(window.location.search).get("error")

      if (queryError === "invalid_or_expired") {
        setError("El enlace es inválido o ha expirado. Solicita uno nuevo para continuar.")
        setCheckingSession(false)
        return
      }

      const { data, error: userError } = await supabase.auth.getUser()
      setValidSession(Boolean(data.user) && !userError)

      if (userError || !data.user) {
        setError("El enlace es inválido o ha expirado. Solicita uno nuevo para continuar.")
      }

      setCheckingSession(false)
    }

    void validateRecoverySession()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError("No pudimos actualizar tu contraseña. Solicita un enlace nuevo e inténtalo otra vez.")
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setSuccess(true)
    setLoading(false)
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
            <h1 className="text-3xl font-bold text-[#E8E6E1] mb-2">Crea una nueva contraseña</h1>
            <p className="text-[#9A9893] leading-relaxed">
              Usa al menos 8 caracteres para proteger tu cuenta.
            </p>
          </div>

          {checkingSession ? (
            <div className="flex items-center justify-center py-12" aria-label="Validando enlace">
              <span className="w-8 h-8 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
            </div>
          ) : success ? (
            <div aria-live="polite">
              <div className="px-4 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <p className="text-emerald-300 text-sm leading-relaxed">
                  Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full text-center bg-[#D97757] text-white font-semibold px-6 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          ) : validSession ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3.5 rounded-xl text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                  placeholder="••••••••"
                />
                <div className="mt-3" aria-live="polite">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= passwordStrength.score ? passwordStrength.color : "bg-[#3A3833]"
                        }`}
                      />
                    ))}
                    {passwordStrength.label && (
                      <span className="w-12 text-right text-xs text-[#9A9893]">
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${password.length >= 8 ? "text-emerald-400" : "text-[#9A9893]"}`}>
                    {password.length >= 8 ? "✓" : "○"} Mínimo 8 caracteres
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
                  Repetir contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3.5 rounded-xl text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20" role="alert">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D97757] text-white font-semibold px-6 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Actualizando contraseña..." : "Guardar nueva contraseña"}
              </button>
            </form>
          ) : (
            <div>
              <div className="px-4 py-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6" role="alert">
                <p className="text-red-400 text-sm leading-relaxed">
                  {error || "No pudimos validar este enlace de recuperación."}
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center bg-[#D97757] text-white font-semibold px-6 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              >
                Solicitar un enlace nuevo
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
