"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
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
  const activeSection = sectionDetails.find((section) =>
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
