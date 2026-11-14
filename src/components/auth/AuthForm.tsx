"use client"

import { useEffect, useState } from "react"
import { Fraunces } from "next/font/google"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { FREE_SIGNUP_CREDITS } from "@/lib/pricing-plans"
import { supabase } from "@/lib/supabase"
import { AUTH_NEXT_COOKIE, AUTH_NEXT_PARAM, authPath, safeNextPath } from "@/lib/auth-next"
import { useToastAnchor } from "@/hooks/useToastAnchor"
import s from "./Auth.module.css"
import { CAPTCHA_MESSAGES, isCaptchaError, useTurnstile } from "./useTurnstile"

const display = Fraunces({ subsets: ["latin"], weight: "variable", axes: ["SOFT", "WONK", "opsz"], display: "swap" })

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
  const [checkingSession, setCheckingSession] = useState(!isRegister)
  // Validated destination after signing in (e.g. back to the plans); null means the dashboard.
  const [nextPath, setNextPath] = useState<string | null>(null)
  const destination = nextPath ?? "/dashboard"
  const logoRef = useToastAnchor<HTMLAnchorElement>()
  const passwordStrength = getPasswordStrength(password)
  const captcha = useTurnstile(isRegister ? "signup" : "login")

  useEffect(() => {
    let active = true

    const checkExistingSession = async () => {
      const params = new URLSearchParams(window.location.search)
      const oauthError = params.get("oauth_error")
      const next = safeNextPath(params.get(AUTH_NEXT_PARAM))
      setNextPath(next)

      if (oauthError === "callback") {
        setError("No pudimos iniciar sesión con Google. Inténtalo nuevamente.")
      }

      if (isRegister) return

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return

      if (user) {
        router.replace(next ?? "/dashboard")
        router.refresh()
        return
      }

      setCheckingSession(false)
    }

    void checkExistingSession()

    return () => {
      active = false
    }
  }, [isRegister, router])

  const handleGoogleAuth = async () => {
    setError("")
    setDuplicateEmail(false)
    setOauthLoading(true)

    try {
      // The OAuth callback reads this short-lived cookie (validated again on the server) to return here.
      document.cookie = nextPath
        ? `${AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)}; Max-Age=600; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`
        : `${AUTH_NEXT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`
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

    const captchaProblem = captcha.blockingMessage()
    if (captchaProblem) {
      setError(captchaProblem)
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { captchaToken: captcha.token } })
        if (error) throw error

        // Con la protección contra enumeración, Supabase puede devolver éxito
        // para un email existente, pero sin identidades asociadas.
        if (data.user?.identities?.length === 0) {
          setDuplicateEmail(true)
          return
        }

        if (data.session) {
          router.push(destination)
          router.refresh()
          return
        }

        toast.success("Cuenta creada", {
          description: "Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
        })
        router.push(`/confirm-email?email=${encodeURIComponent(email)}`)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha.token } })
        if (error) throw error
        router.push(destination)
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error inesperado"

      if (isRegister && message.toLowerCase().includes("user already registered")) {
        setDuplicateEmail(true)
      } else if (isCaptchaError(message)) {
        setError(CAPTCHA_MESSAGES.rejected)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
      // Turnstile tokens are single-use: every attempt gets a fresh challenge.
      captcha.reset()
    }
  }

  if (checkingSession) {
    return (
      <main className={s.loading}>
        <div className={s.spinner} aria-label="Comprobando sesión" />
      </main>
    )
  }

  return (
    <main className={s.page}>
      <aside className={s.brand}>
        <Link ref={logoRef} href="/" className={s.logo} aria-label="PixelFM, inicio">
          <img src="/pixelfm-logo.png" alt="" aria-hidden="true" />
          <span>Pixel<span>FM</span></span>
        </Link>

        <div className={s.pitch}>
          <h2 className={display.className}>
            {isRegister
              ? <>Tu primer anuncio <span className={s.accent}>empieza aquí</span></>
              : <>Tu estudio <span className={s.accent}>sigue aquí</span></>}
            <span className={s.pixel}>.</span>
          </h2>
          <p>
            {isRegister
              ? `${FREE_SIGNUP_CREDITS} créditos gratis para crear imágenes y videos publicitarios. Sin tarjeta.`
              : "Tus imágenes, videos e ideas te esperan justo donde los dejaste."}
          </p>
        </div>

        <div className={s.fan} aria-hidden="true">
          <figure className={s.piece}><Image src="/landing/perro-imagen.jpg" alt="" fill sizes="224px" /></figure>
          <figure className={s.piece}><Image src="/landing/carro-imagen.jpg" alt="" fill sizes="224px" priority /></figure>
          <figure className={s.piece}><Image src="/landing/audifonos-imagen.jpg" alt="" fill sizes="224px" /></figure>
        </div>
      </aside>

      <section className={s.formSide}>
        <div className={s.inner}>
          <Link href="/" className={s.back}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>

          <div className={s.card}>
            <h1 className={display.className}>
              {isRegister ? "Crear cuenta" : "Bienvenido de vuelta"}
            </h1>
            <p className={s.lead}>
              {nextPath
                ? isRegister ? "Crea tu cuenta para elegir tu plan" : "Inicia sesión o crea una cuenta para elegir tu plan"
                : isRegister
                  ? "Regístrate para comenzar a crear anuncios"
                  : "Ingresa tus credenciales para continuar"}
            </p>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={oauthLoading || loading}
              className={s.google}
            >
              <svg width={20} height={20} viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 01-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 009 18z" />
                <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 013.681 9c0-.592.102-1.168.282-1.707V4.961H.956A9 9 0 000 9c0 1.452.347 2.827.956 4.039l3.007-2.332z" />
                <path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 00.956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579z" />
              </svg>
              {oauthLoading ? "Conectando con Google..." : "Continuar con Google"}
            </button>

            <div className={s.divider} aria-hidden="true">
              <span />
              o continúa con correo
              <span />
            </div>

            <form onSubmit={handleSubmit} className={s.form}>
              <div className={s.field}>
                <label htmlFor="email" className={s.label}>Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={s.input}
                  placeholder="tu@email.com"
                />
              </div>

              <div className={s.field}>
                <div className={s.labelRow}>
                  <label htmlFor="password" className={s.label}>Contraseña</label>
                  {!isRegister && (
                    <Link href="/forgot-password" className={s.forgot}>Olvidé mi contraseña</Link>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : undefined}
                  className={s.input}
                  placeholder="••••••••"
                />
                {isRegister && (
                  <div className={s.strength} aria-live="polite">
                    <div className={s.meter}>
                      {[1, 2, 3].map((level) => (
                        <span
                          key={level}
                          className={level <= passwordStrength.score ? passwordStrength.color : "bg-[#3A3833]"}
                        />
                      ))}
                      {passwordStrength.label && <small>{passwordStrength.label}</small>}
                    </div>
                    <p className={`${s.rule} ${password.length >= 8 ? s.ruleMet : ""}`}>
                      {password.length >= 8 ? "✓" : "○"} Mínimo 8 caracteres
                    </p>
                  </div>
                )}
              </div>

              {isRegister && (
                <div className={s.field}>
                  <label htmlFor="confirmPassword" className={s.label}>Repetir contraseña</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className={s.input}
                    placeholder="••••••••"
                  />
                </div>
              )}

              {captcha.widget}

              {error && (
                <div className={s.alert}>
                  <p>{error}</p>
                </div>
              )}

              {duplicateEmail && (
                <div className={s.notice} role="alert">
                  <p>
                    Este email ya tiene una cuenta. ¿Quieres{" "}
                    <Link href={authPath("/login", nextPath)}>iniciar sesión?</Link>
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading || oauthLoading} className={s.submit}>
                {loading ? (
                  <>
                    <svg fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </>
                ) : isRegister ? (
                  "Crear cuenta"
                ) : (
                  "Iniciar sesión"
                )}
              </button>
            </form>

            <Link href={authPath(isRegister ? "/login" : "/register", nextPath)} className={s.switch}>
              {isRegister ? (
                <>¿Ya tienes cuenta? <span>Inicia sesión</span></>
              ) : (
                <>¿No tienes cuenta? <span>Regístrate</span></>
              )}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
