"use client"

import Link from "next/link"
import type { MouseEvent } from "react"
import { useToastAnchor } from "@/hooks/useToastAnchor"
import { useHasSession } from "./useHasSession"

const LINKS = [
  { href: "#producto", label: "Producto" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#ejemplos", label: "Ejemplos" },
  { href: "#precios", label: "Precios" },
]

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="PixelFM, inicio">
      <img className="logoMark" src="/pixelfm-logo-mark.webp" alt="" aria-hidden="true" />
      <span>Pixel<span>FM</span></span>
    </Link>
  )
}

const closeMenu = (event: MouseEvent<HTMLElement>) => event.currentTarget.closest("details")?.removeAttribute("open")

export default function LandingNav() {
  const signedIn = useHasSession()
  const navRef = useToastAnchor<HTMLElement>()

  return (
    <header className="navShell">
      <nav ref={navRef} className="nav glass" aria-label="Navegación principal">
        <Logo />
        <div className="navLinks">
          {LINKS.map(({ href, label }) => <a href={href} key={href}>{label}</a>)}
        </div>
        <div className="navCtas">
          {signedIn
            ? <Link className="button small" href="/dashboard">Ir al dashboard</Link>
            : <>
              <Link className="login" href="/login">Iniciar sesión</Link>
              <Link className="button small" href="/register">Probar gratis</Link>
            </>}
        </div>
        <details className="mobileMenu">
          <summary aria-label="Abrir menú"><span /><span /></summary>
          <div>
            {LINKS.map(({ href, label }) => <a href={href} key={href} onClick={closeMenu}>{label}</a>)}
            {signedIn
              ? <Link href="/dashboard">Ir al dashboard</Link>
              : <>
                <Link href="/login">Iniciar sesión</Link>
                <Link href="/register">Probar gratis</Link>
              </>}
          </div>
        </details>
      </nav>
    </header>
  )
}
