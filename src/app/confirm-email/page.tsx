"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import AuthShell from "@/components/auth/AuthShell"
import s from "@/components/auth/Auth.module.css"
import { FREE_SIGNUP_CREDITS } from "@/lib/pricing-plans"

// Reads ?email= on the client; Suspense lets the rest of the page prerender.
function SentTo() {
  const email = useSearchParams().get("email")
  if (!email) return null
  return (
    <p className={s.chip}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span>Enviado a: <b>{email}</b></span>
    </p>
  )
}

export default function ConfirmEmailPage() {
  return (
    <AuthShell
      pitch={<>Ya casi <span className={s.accent}>estás dentro</span></>}
      pitchText={`Confirma tu correo y empieza con ${FREE_SIGNUP_CREDITS} créditos gratis para crear imágenes y videos publicitarios.`}
      back={{ href: "/", label: "Volver" }}
      title="Confirma tu correo"
      lead="Te enviamos un enlace de confirmación para activar tu cuenta de PixelFM."
    >
      <Suspense fallback={null}>
        <SentTo />
      </Suspense>

      <div className={s.stack}>
        <p className={s.hint}>
          Revisa tu bandeja de entrada y también la carpeta de spam. Después de confirmar tu correo, podrás iniciar sesión.
        </p>
        <Link href="/login" className={s.submit}>Ir a iniciar sesión</Link>
        <Link href="/register" className={s.switch}>¿Te equivocaste de correo? <span>Usar otro correo</span></Link>
      </div>
    </AuthShell>
  )
}
