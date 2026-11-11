"use client"

import { Fraunces } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { ArrowUpRight, Check, Play } from "lucide-react"
import { FREE_CREDITS_COPY } from "@/lib/pricing-plans"
import HeroField from "./HeroField"
import LandingVideo from "./LandingVideo"
import { useHasSession } from "./useHasSession"
import { MEDIA, posterOf, type MediaKey } from "./landing-data"
import s from "./Landing.module.css"

const display = Fraunces({ subsets: ["latin"], weight: "variable", axes: ["SOFT", "WONK", "opsz"], display: "swap" })

const GoogleMark = () => (
  <svg width={16} height={16} viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 01-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.615z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.836.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 009 18z" />
    <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 013.681 9c0-.592.102-1.168.282-1.707V4.961H.956A9 9 0 000 9c0 1.452.347 2.827.956 4.039l3.007-2.332z" />
    <path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 00.956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579z" />
  </svg>
)

/** The fan of real outputs: x / y / rotation / size / pointer depth. */
const CARDS: { key: MediaKey; x: string; y: string; r: string; w: string; k: number; slot: string; crop?: CSSProperties }[] = [
  { key: "carro", x: "-218%", y: "-5%", r: "-10deg", w: "15.5%", k: -7, slot: "outer", crop: { transform: "scale(1.9)", transformOrigin: "25% 78%" } },
  { key: "perro", x: "-112%", y: "-2%", r: "-5deg", w: "19%", k: -12, slot: "inner" },
  { key: "audifonos", x: "112%", y: "-2%", r: "5deg", w: "19%", k: -12, slot: "inner" },
  { key: "scooter", x: "218%", y: "-5%", r: "10deg", w: "15.5%", k: -7, slot: "outer", crop: { transform: "scale(1.4)", transformOrigin: "50% 100%" } },
]

export default function LandingHero() {
  const stage = useRef<HTMLDivElement>(null)
  const signedIn = useHasSession()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState("")

  const handleGoogleAuth = async () => {
    setGoogleError("")
    setGoogleLoading(true)

    try {
      const { supabase } = await import("@/lib/supabase")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch {
      setGoogleError("No pudimos conectar con Google. Inténtalo nuevamente.")
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    const target = stage.current
    if (!target || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return
    let frame = 0
    const onMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5
      const y = event.clientY / window.innerHeight - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        target.style.setProperty("--mx", x.toFixed(3))
        target.style.setProperty("--my", y.toFixed(3))
      })
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={s.heroBackdrop} aria-hidden="true">
        <i className={s.heroGrid} />
        <i className={s.heroGlow} />
        <i className={s.heroGlowCool} />
        <HeroField />
        <i className={s.heroSweep} />
      </div>

      <div className={s.heroCopy}>
        <span className={s.pill}><i aria-hidden="true" />Imagen + Video para Meta Ads</span>
        <h1 id="hero-title" className={display.className}>De tu producto a<br /> <span className={s.heroAccent}>anuncios listos</span> para probar<span className={s.heroPixel}>.</span></h1>
        <p>Crea imágenes y videos publicitarios con dirección creativa incluida. PixelFM convierte una idea o referencia en creativos listos para llevar a Meta Ads.</p>
        <div className={s.heroActions}>
          <Link className={s.ctaPrimary} href={signedIn ? "/dashboard" : "/register"}>{signedIn ? "Ir al dashboard" : "Crear mi anuncio"} <ArrowUpRight aria-hidden="true" /></Link>
          <a className={s.ctaGhost} href="#como-funciona"><span aria-hidden="true"><Play /></span>Ver cómo funciona</a>
        </div>
        <div className={s.heroQuick}>
          {signedIn
            ? <small><Check aria-hidden="true" />Tu sesión está activa</small>
            : <>
              <button type="button" onClick={handleGoogleAuth} disabled={googleLoading}>
                <GoogleMark />
                {googleLoading ? "Conectando..." : "Continuar con Google"}
              </button>
              <small><Check aria-hidden="true" />{FREE_CREDITS_COPY}</small>
            </>}
        </div>
        {googleError && <p className={s.heroError} role="alert">{googleError}</p>}
      </div>

      <div ref={stage} className={s.heroStage} data-parallax="-0.05">
        {CARDS.map(({ key, x, y, r, w, k, slot, crop }, index) => (
          <figure
            key={key}
            className={s.heroCard}
            data-slot={slot}
            style={{ "--x": x, "--y": y, "--r": r, "--w": w, "--k": k, "--i": index } as CSSProperties}
          >
            <span>
              <Image src={MEDIA[key].image} alt={MEDIA[key].alt} fill sizes="(max-width: 760px) 34vw, 240px" priority={slot === "inner"} style={crop} />
            </span>
            <figcaption>Imagen</figcaption>
          </figure>
        ))}

        <figure className={`${s.heroCard} ${s.heroCardMain}`} style={{ "--x": "0%", "--y": "0%", "--r": "0deg", "--w": "24%", "--k": -18, "--i": 4 } as CSSProperties}>
          <span>
            <LandingVideo src={MEDIA.carro.video} poster={posterOf("carro")} label={MEDIA.carro.alt} deferred />
          </span>
          <figcaption><i aria-hidden="true" />Video</figcaption>
        </figure>
      </div>
    </section>
  )
}
