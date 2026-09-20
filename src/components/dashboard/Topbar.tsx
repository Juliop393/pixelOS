"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"
import styles from "./DashboardShell.module.css"

const sectionDetails = [
  { path: "/dashboard/imagenes", title: "Imágenes", description: "Generador de creativos" },
  { path: "/dashboard/videos", title: "Videos", description: "Constructor de anuncios en movimiento" },
  { path: "/dashboard/campanas", title: "Identidad", description: "Marca y recursos visuales" },
  { path: "/dashboard/assets", title: "Mis Creativos", description: "Biblioteca de resultados" },
  { path: "/dashboard/configuracion", title: "Configuración", description: "Preferencias de la cuenta" },
  { path: "/dashboard", title: "Inicio", description: "Tu espacio creativo" },
]

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { credits, setCredits, setUserId } = useCredits()
  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserEmail(user.email ?? "")
      setFullName(
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : ""
      )
    }

    loadUser()
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      // Si la revocación remota falla, elimina al menos la sesión de este navegador.
      const { error: localError } = await supabase.auth.signOut({ scope: "local" })

      if (localError) {
        toast.error("No pudimos cerrar la sesión. Inténtalo nuevamente.")
        return
      }
    }

    setCredits(0)
    setUserId(null)
    router.replace("/login")
    router.refresh()
  }

  const displayName = fullName || userEmail.split("@")[0] || "Usuario"
  const avatarLetter = (displayName[0] ?? "U").toUpperCase()
  const isHome = pathname === "/dashboard"
  const usesCompactShell = isHome || pathname.startsWith("/dashboard/assets") || pathname.startsWith("/dashboard/configuracion")
  const activeSection = sectionDetails.find((section) =>
    section.path === "/dashboard" ? pathname === section.path : pathname.startsWith(section.path)
  ) ?? sectionDetails[sectionDetails.length - 1]

  return (
    <header className={styles.topbar}>
      <div className={styles.sectionContext}>
        {usesCompactShell ? (<>
          <Link href="/dashboard" className={styles.homeBrand} aria-label="PixelFM — Inicio">
            <img src="/logo_PixelOS.png" width={44} height={44} alt="" />
            <span>
              <b>Pixel<strong>FM</strong></b>
              <small>Tu espacio creativo</small>
            </span>
          </Link>
          {!isHome && <>
            <i className={styles.sectionDivider} aria-hidden="true" />
            <span className={styles.currentSection}>
              <b>{activeSection.title}</b>
              <small>{activeSection.description}</small>
            </span>
          </>}
        </>) : (<>
        <i className={styles.contextMark} aria-hidden="true">
          <svg width={17} height={17} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3v2m6.364.636-1.414 1.414M21 12h-2M5 12H3m4.05-4.95L5.636 5.636M9 18h6m-5 3h4m3-9a5 5 0 1 0-8.18 3.86c.74.62 1.18 1.52 1.18 2.49h4c0-.97.44-1.87 1.18-2.49A4.98 4.98 0 0 0 17 12Z" />
          </svg>
        </i>
        <span>
          <b>{activeSection.title}</b>
          <small>{activeSection.description}</small>
        </span>
        </>)}
      </div>

      <div className={styles.accountArea}>
        <Link href="/pricing" aria-label="Ver planes y comprar créditos" className={styles.credits}>
          <span>ϟ</span>
          <b>{credits.toLocaleString()}</b>
          <small>créditos</small>
        </Link>

        <Link href="/pricing" className={styles.recharge}>Recargar</Link>

        {usesCompactShell && <Link
          href="/dashboard/configuracion"
          className={`${styles.settingsLink} ${pathname.startsWith("/dashboard/configuracion") ? styles.settingsActive : ""}`}
          aria-label="Configuración"
          aria-current={pathname.startsWith("/dashboard/configuracion") ? "page" : undefined}
        >
          <svg width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M10.3 4.3c.4-1.7 2.9-1.7 3.4 0a1.7 1.7 0 0 0 2.5 1.1c1.6-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1.1 2.5c1.7.4 1.7 2.9 0 3.4a1.7 1.7 0 0 0-1.1 2.5c.9 1.6-.8 3.3-2.4 2.4a1.7 1.7 0 0 0-2.5 1.1c-.5 1.7-3 1.7-3.4 0a1.7 1.7 0 0 0-2.5-1.1c-1.6.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1.1-2.5c-1.7-.5-1.7-3 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 0 0 2.5-1.1Z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span>Configuración</span>
        </Link>}

        <span className={styles.accountDivider} aria-hidden="true" />

        <Link
          href="/dashboard/configuracion#cuenta"
          className={styles.profile}
          aria-label="Abrir configuración de cuenta"
        >
          <i className={styles.avatar}>{avatarLetter}</i>
          <span className={styles.profileText}>
            <b>{displayName}</b>
            <small>{fullName && userEmail ? userEmail : "Cuenta de PixelFM"}</small>
          </span>
        </Link>

        <button onClick={handleSignOut} className={styles.logout}>Salir</button>
      </div>
    </header>
  )
}
