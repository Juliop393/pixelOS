"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface AuthFormProps {
  mode: "login" | "register"
}

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "bg-[#3A3833]" }

  let score = password.length >= 8 ? 1 : 0
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  if (score >= 3) return { score, label: "Fuerte", color: "bg-emerald-400" }
  if (score === 2) return { score, label: "Media", color: "bg-amber-400" }
  return { score: Math.max(score, 1), label: "Débil", color: "bg-red-400" }
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const isRegister = mode === "register"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [duplicateEmail, setDuplicateEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    const oauthError = new URLSearchParams(window.location.search).get("oauth_error")

    if (oauthError === "callback") {
      setError("No pudimos iniciar sesión con Google. Inténtalo nuevamente.")
    }
  }, [])

  const handleGoogleAuth = async () => {
    setError("")
    setDuplicateEmail(false)
    setOauthLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch {
      setError("No pudimos iniciar sesión con Google. Inténtalo nuevamente.")
      setOauthLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setDuplicateEmail(false)

    if (isRegister && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (isRegister && password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        // Con la protección contra enumeración, Supabase puede devolver éxito
        // para un email existente, pero sin identidades asociadas.
        if (data.user?.identities?.length === 0) {
          setDuplicateEmail(true)
          return
        }

        if (data.session) {
          router.push("/dashboard")
          router.refresh()
          return
        }

        toast.success("Cuenta creada", {
          description: "Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
        })
        router.push(`/confirm-email?email=${encodeURIComponent(email)}`)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error inesperado"

      if (isRegister && message.toLowerCase().includes("user already registered")) {
        setDuplicateEmail(true)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

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

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#E8E6E1] mb-2">
              {isRegister ? "Crear cuenta" : "Bienvenido de vuelta"}
            </h1>
            <p className="text-[#9A9893]">
              {isRegister
                ? "Regístrate para comenzar a crear anuncios"
                : "Ingresa tus credenciales para continuar"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-[#E8E6E1] text-[#1E1C1A] font-semibold px-6 py-4 rounded-xl hover:bg-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" width={20} height={20} viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 01-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 009 18z" />
              <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 013.681 9c0-.592.102-1.168.282-1.707V4.961H.956A9 9 0 000 9c0 1.452.347 2.827.956 4.039l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 00.956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579z" />
            </svg>
            {oauthLoading ? "Conectando con Google..." : "Continuar con Google"}
          </button>

          <div className="flex items-center gap-4 my-6" aria-hidden="true">
            <span className="h-px flex-1 bg-[#3A3833]" />
            <span className="text-xs text-[#9A9893] whitespace-nowrap">o continúa con correo</span>
            <span className="h-px flex-1 bg-[#3A3833]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3.5 rounded-xl text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isRegister ? 8 : undefined}
                className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3.5 rounded-xl text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                placeholder="••••••••"
              />
              {isRegister && (
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
              )}
            </div>

            {isRegister && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2"
                >
                  Repetir contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3.5 rounded-xl text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {duplicateEmail && (
              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20" role="alert">
                <p className="text-amber-300 text-sm">
                  Este email ya tiene una cuenta. ¿Quieres{" "}
                  <Link href="/login" className="font-semibold underline underline-offset-2 hover:text-amber-200">
                    iniciar sesión?
                  </Link>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || oauthLoading}
              className="w-full bg-[#D97757] text-white font-semibold px-6 py-4 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" width={20} height={20} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </span>
              ) : isRegister ? (
                "Crear cuenta"
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#3A3833] text-center">
            <Link
              href={isRegister ? "/login" : "/register"}
              className="text-sm text-[#9A9893] hover:text-[#E8E6E1] transition-colors"
            >
              {isRegister ? (
                <>¿Ya tienes cuenta? <span className="text-[#D97757] font-semibold">Inicia sesión</span></>
              ) : (
                <>¿No tienes cuenta? <span className="text-[#D97757] font-semibold">Regístrate</span></>
              )}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
