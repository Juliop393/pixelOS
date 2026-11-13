import type { ReactNode } from "react"
import { Fraunces } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import s from "./Auth.module.css"

export const authDisplay = Fraunces({ subsets: ["latin"], weight: "variable", axes: ["SOFT", "WONK", "opsz"], display: "swap" })

/*
 * The login/register layout (brand side with real outputs, glass card on the right) for the
 * other account pages: password recovery, new password and email confirmation.
 */
export default function AuthShell({ pitch, pitchText, back, title, lead, children }: {
  pitch: ReactNode
  pitchText: string
  back: { href: string; label: string }
  title: string
  lead?: ReactNode
  children: ReactNode
}) {
  return (
    <main className={s.page}>
      <aside className={s.brand}>
        <Link href="/" className={s.logo} aria-label="PixelFM, inicio">
          <img src="/pixelfm-logo.png" alt="" aria-hidden="true" />
          <span>Pixel<span>FM</span></span>
        </Link>

        <div className={s.pitch}>
          <h2 className={authDisplay.className}>{pitch}<span className={s.pixel}>.</span></h2>
          <p>{pitchText}</p>
        </div>

        <div className={s.fan} aria-hidden="true">
          <figure className={s.piece}><Image src="/landing/perro-imagen.jpg" alt="" fill sizes="224px" /></figure>
          <figure className={s.piece}><Image src="/landing/carro-imagen.jpg" alt="" fill sizes="224px" priority /></figure>
          <figure className={s.piece}><Image src="/landing/audifonos-imagen.jpg" alt="" fill sizes="224px" /></figure>
        </div>
      </aside>

      <section className={s.formSide}>
        <div className={s.inner}>
          <Link href={back.href} className={s.back}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {back.label}
          </Link>

          <div className={s.card}>
            <h1 className={authDisplay.className}>{title}</h1>
            {lead && <p className={s.lead}>{lead}</p>}
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
