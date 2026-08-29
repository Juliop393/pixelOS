"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"
import styles from "./DashboardShell.module.css"

const sectionDetails = [
  { path: "/dashboard/videos", title: "Videos", description: "Constructor de anuncios en movimiento" },
  { path: "/dashboard/campanas", title: "Identidad", description: "Marca y recursos visuales" },
  { path: "/dashboard/assets", title: "Mis Creativos", description: "Biblioteca de resultados" },
  { path: "/dashboard/configuracion", title: "Configuración", description: "Preferencias de la cuenta" },
  { path: "/dashboard/perfil", title: "Perfil", description: "Información de tu cuenta" },
  { path: "/dashboard", title: "Imágenes", description: "Generador de creativos" },
]

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { credits } = useCredits()
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
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const displayName = fullName || userEmail.split("@")[0] || "Usuario"
  const avatarLetter = (displayName[0] ?? "U").toUpperCase()
  const pixelAiActive = pathname === "/dashboard" && searchParams.get("pixelai") === "open"
  const activeSection = pixelAiActive
    ? { title: "PixelAI", description: "Asistente estratégico" }
    : sectionDetails.find((section) =>
        section.path === "/dashboard" ? pathname === section.path : pathname.startsWith(section.path)
      ) ?? sectionDetails[sectionDetails.length - 1]

  return (
    <header className={styles.topbar}>
      <div className={styles.sectionContext}>
        <i className={styles.contextMark} aria-hidden="true">
          <svg width={17} height={17} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3v2m6.364.636-1.414 1.414M21 12h-2M5 12H3m4.05-4.95L5.636 5.636M9 18h6m-5 3h4m3-9a5 5 0 1 0-8.18 3.86c.74.62 1.18 1.52 1.18 2.49h4c0-.97.44-1.87 1.18-2.49A4.98 4.98 0 0 0 17 12Z" />
          </svg>
        </i>
        <span>
          <b>{activeSection.title}</b>
          <small>{activeSection.description}</small>
        </span>
      </div>

      <nav className={styles.creatorNav} aria-label="Herramientas de creación">
        <Link
          href="/dashboard"
          aria-current={pathname === "/dashboard" && !pixelAiActive ? "page" : undefined}
          className={`${styles.creatorNavLink} ${pathname === "/dashboard" && !pixelAiActive ? styles.creatorNavActive : ""}`}
        >
          <svg width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="m4 16 4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
          </svg>
          <span>Generar imagen</span>
        </Link>
        <Link
          href="/dashboard/videos"
          aria-current={pathname.startsWith("/dashboard/videos") ? "page" : undefined}
          className={`${styles.creatorNavLink} ${pathname.startsWith("/dashboard/videos") ? styles.creatorNavActive : ""}`}
        >
          <svg width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="m15 10 4.6-2.3A1 1 0 0 1 21 8.6v6.8a1 1 0 0 1-1.4.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z" />
          </svg>
          <span>Generar video</span>
        </Link>
        <Link
          href="/dashboard?pixelai=open"
          aria-current={pixelAiActive ? "page" : undefined}
          className={`${styles.creatorNavLink} ${pixelAiActive ? styles.creatorNavActive : ""}`}
        >
          <svg width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3 13.4 7.6 18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Zm6 11 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
          </svg>
          <span>PixelAI</span>
        </Link>
      </nav>

      <div className={styles.accountArea}>
        <Link href="/pricing" aria-label="Ver planes y comprar créditos" className={styles.credits}>
          <span>ϟ</span>
          <b>{credits.toLocaleString()}</b>
          <small>créditos</small>
        </Link>

        <Link href="/pricing" className={styles.recharge}>Recargar</Link>

        <span className={styles.accountDivider} aria-hidden="true" />

        <Link href="/dashboard/perfil" className={styles.profile} aria-label="Abrir perfil">
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
