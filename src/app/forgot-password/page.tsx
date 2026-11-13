"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import AuthShell from "@/components/auth/AuthShell"
import s from "@/components/auth/Auth.module.css"
import { CAPTCHA_MESSAGES, isCaptchaError, useTurnstile } from "@/components/auth/useTurnstile"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const [captchaError, setCaptchaError] = useState("")
  const captcha = useTurnstile("recovery")

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error")
    setLinkError(error === "invalid_or_expired")
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setCaptchaError("")

    const captchaProblem = captcha.blockingMessage()
    if (captchaProblem) {
      setCaptchaError(captchaProblem)
      return
    }

    setLoading(true)
    let rejectedByCaptcha = false

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/recovery/callback`,
        captchaToken: captcha.token,
      })
      // A failed captcha says nothing about the account, so it is the only error shown.
      rejectedByCaptcha = isCaptchaError(error?.message)
    } catch {
      // Se conserva la misma respuesta para no revelar si el correo existe.
    } finally {
      setLoading(false)
      captcha.reset()
      if (rejectedByCaptcha) {
        setCaptchaError(CAPTCHA_MESSAGES.rejected)
      } else {
        // La respuesta es deliberadamente idéntica exista o no la cuenta.
        setSubmitted(true)
      }
    }
  }

  return (
    <AuthShell
      pitch={<>Recupera tu <span className={s.accent}>acceso</span></>}
      pitchText="Te enviamos un enlace seguro para crear una nueva contraseña. Funciona en cualquier navegador o dispositivo."
      back={{ href: "/login", label: "Volver al inicio de sesión" }}
      title="Recupera tu contraseña"
      lead={submitted ? undefined : "Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."}
    >
      {submitted ? (
        <div className={s.stack} aria-live="polite">
          <div className={s.success}>
            <p>Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.</p>
          </div>
          <button type="button" onClick={() => setSubmitted(false)} className={s.secondary}>
            Enviar a otro correo
          </button>
          <Link href="/login" className={s.switch}>¿La recordaste? <span>Inicia sesión</span></Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={s.form}>
          {linkError && (
            <div className={s.notice} role="alert">
              <p>El enlace es inválido o ha expirado. Solicita uno nuevo para continuar.</p>
            </div>
          )}

          <div className={s.field}>
            <label htmlFor="email" className={s.label}>Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={s.input}
              placeholder="tu@email.com"
            />
          </div>

          {captcha.widget}

          {captchaError && (
            <div className={s.notice} role="alert">
              <p>{captchaError}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className={s.submit}>
            {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
