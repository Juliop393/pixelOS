"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import AuthShell from "@/components/auth/AuthShell"
import s from "@/components/auth/Auth.module.css"

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
    <AuthShell
      pitch={<>Una contraseña <span className={s.accent}>nueva</span></>}
      pitchText="Elige una contraseña segura y vuelve a tu estudio en un momento."
      back={{ href: "/login", label: "Volver al inicio de sesión" }}
      title="Crea una nueva contraseña"
      lead={success || (!checkingSession && !validSession) ? undefined : "Usa al menos 8 caracteres para proteger tu cuenta."}
    >
      {checkingSession ? (
        <div className={s.checking} aria-label="Validando enlace">
          <div className={s.spinner} />
        </div>
      ) : success ? (
        <div className={s.stack} aria-live="polite">
          <div className={s.success}>
            <p>Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
          </div>
          <Link href="/login" className={s.submit}>Ir a iniciar sesión</Link>
        </div>
      ) : validSession ? (
        <form onSubmit={handleSubmit} className={s.form}>
          <div className={s.field}>
            <label htmlFor="password" className={s.label}>Nueva contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className={s.input}
              placeholder="••••••••"
            />
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
          </div>

          <div className={s.field}>
            <label htmlFor="confirmPassword" className={s.label}>Repetir contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className={s.input}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={s.alert} role="alert">
              <p>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className={s.submit}>
            {loading ? "Actualizando contraseña..." : "Guardar nueva contraseña"}
          </button>
        </form>
      ) : (
        <div className={s.stack}>
          <div className={s.alert} role="alert">
            <p>{error || "No pudimos validar este enlace de recuperación."}</p>
          </div>
          <p className={s.hint}>Los enlaces funcionan una sola vez y caducan por seguridad. Pide uno nuevo y ábrelo desde el último correo que recibas.</p>
          <Link href="/forgot-password" className={s.submit}>Solicitar un enlace nuevo</Link>
        </div>
      )}
    </AuthShell>
  )
}
