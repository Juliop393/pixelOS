"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Image as ImageIcon, LogOut, Video } from "lucide-react"
import CreditPacksDialog from "@/components/CreditPacksDialog"
import PixelAiDrawer from "./PixelAiDrawer"
import PixelAiOrb from "./PixelAiOrb"
import { usePixelAi } from "@/lib/pixel-ai-context"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"
import { useToastAnchor } from "@/hooks/useToastAnchor"
import styles from "./DashboardShell.module.css"

const sectionDetails = [
  { path: "/dashboard/imagenes", title: "Imágenes", description: "Generador de creativos" },
  { path: "/dashboard/videos", title: "Videos", description: "Constructor de anuncios en movimiento" },
  { path: "/dashboard/campanas", title: "Identidad", description: "Marca y recursos visuales" },
  { path: "/dashboard/assets", title: "Mis Creativos", description: "Biblioteca de resultados" },
  { path: "/dashboard/configuracion", title: "Configuración", description: "Preferencias de la cuenta" },
  { path: "/dashboard/pricing", title: "Planes", description: "Planes y créditos" },
  { path: "/dashboard/admin", title: "Administración", description: "Usuarios de PixelFM" },
  { path: "/dashboard", title: "Inicio", description: "Tu espacio creativo" },
]

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { credits, setCredits, setUserId } = useCredits()
  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [packsOpen, setPacksOpen] = useState(false)
  const headerRef = useToastAnchor<HTMLElement>()
  const { host } = usePixelAi()
  // Pages without their own PixelIA panel (Mis creativos, Planes...) get a general one here.
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const [fallbackMounted, setFallbackMounted] = useState(false)
  const pixelAiOpen = host ? host.open : fallbackOpen
  const togglePixelAi = () => {
    if (host) { host.setOpen((open) => !open); return }
    setFallbackMounted(true)
    setFallbackOpen((open) => !open)
  }

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
  const isVideo = pathname.startsWith("/dashboard/videos")
  const isEditor = pathname.startsWith("/dashboard/imagenes") || isVideo
  const ToolIcon = isVideo ? Video : ImageIcon
  const activeSection = sectionDetails.find((section) =>
    section.path === "/dashboard" ? pathname === section.path : pathname.startsWith(section.path)
  ) ?? sectionDetails[sectionDetails.length - 1]

  return (
    <div className={styles.topRow}>
    {!isHome && <nav className={styles.editorNav} aria-label="Volver al inicio">
      <Link href="/dashboard" className={styles.editorBack}>
        <ArrowLeft aria-hidden="true" />
        <span>Inicio</span>
      </Link>
      {isEditor && <span className={styles.editorTool} aria-current="page">
        <ToolIcon aria-hidden="true" />
        <span>{isVideo ? "Video" : "Imágenes"}</span>
      </span>}
    </nav>}
    <header ref={headerRef} className={styles.topbar}>
      <div className={styles.sectionContext}>
        <Link href="/dashboard" className={styles.homeBrand} aria-label="PixelFM — Inicio">
          <img src="/logo_PixelOS.png" width={44} height={44} alt="" />
          <span>
            <b>Pixel<strong>FM</strong></b>
            <small>Tu espacio creativo</small>
          </span>
        </Link>
        {!isHome && !isEditor && <>
          <i className={styles.sectionDivider} aria-hidden="true" />
          <span className={styles.currentSection}>
            <b>{activeSection.title}</b>
            <small>{activeSection.description}</small>
          </span>
        </>}
      </div>

      <PixelAiOrb className={styles.orbInline} open={pixelAiOpen} onToggle={togglePixelAi} compact />

      <div className={styles.accountArea}>
        <div className={styles.wallet}>
          <button type="button" onClick={() => setPacksOpen(true)} aria-label="Recargar créditos" className={styles.credits}>
            <span className={styles.creditToken} aria-hidden="true"><i /><i /><i /><i /></span>
            <b>{credits.toLocaleString()}</b>
            <small>créditos</small>
          </button>

          <button type="button" onClick={() => setPacksOpen(true)} className={styles.recharge}>Recargar</button>
        </div>

        <div className={styles.accountCluster}>
        <Link
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
        </Link>

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

        <button onClick={handleSignOut} className={styles.logout}>
          <LogOut aria-hidden="true" />
          <span>Salir</span>
        </button>
        </div>
      </div>
      <nav className={styles.mobileNav} aria-label="Navegación móvil">
        {[
          { href: "/dashboard", label: "Inicio" },
          { href: "/dashboard/imagenes", label: "Imágenes" },
          { href: "/dashboard/videos", label: "Video" },
          { href: "/dashboard/assets", label: "Mis creativos" },
        ].map(({ href, label }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href)
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? styles.mobileNavActive : ""}>{label}</Link>
        })}
      </nav>
      <CreditPacksDialog open={packsOpen} onClose={() => setPacksOpen(false)} />
    </header>
    <PixelAiOrb className={styles.orbDock} open={pixelAiOpen} onToggle={togglePixelAi} />
    {!host && fallbackMounted && <PixelAiDrawer open={fallbackOpen} onOpenChange={setFallbackOpen} />}
    </div>
  )
}
