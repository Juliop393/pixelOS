"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import LandingVideo from "./LandingVideo"
import { MEDIA, posterOf } from "./landing-data"
import s from "./Landing.module.css"

const STEPS = [
  { label: "Referencia", title: "Empiezas con tu producto.", text: "Sube una foto o describe lo que vendes. Con eso basta para arrancar." },
  { label: "Dirección", title: "PixelFM decide cómo contarlo.", text: "Ángulo, estilo y formato se ordenan alrededor de lo que quieres lograr." },
  { label: "Creativo", title: "Y se convierte en publicidad.", text: "Una imagen lista para Meta Ads que también puede cobrar vida como video." },
]

/**
 * The one pinned moment of the page. It rides on position: sticky, so the native
 * scroll is never intercepted: the stage just reads how far the section has travelled.
 */
export default function LandingStory() {
  const section = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const target = section.current
    if (!target) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.style.setProperty("--p", "1")
      target.style.setProperty("--f", "1")
      setStep(2)
      return
    }

    let frame = 0
    const paint = () => {
      frame = 0
      const box = target.getBoundingClientRect()
      const travel = Math.max(1, box.height - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -box.top / travel))
      target.style.setProperty("--p", progress.toFixed(4))
      // The packshot rests until the visitor really starts to scroll, then eases open.
      // The framing finishes before the last beat so the final ad gets to rest.
      const open = Math.min(1, Math.max(0, (progress - 0.07) / 0.61))
      target.style.setProperty("--f", (open * open * (3 - 2 * open)).toFixed(4))
      setStep(progress < 0.3 ? 0 : progress < 0.66 ? 1 : 2)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    paint()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [])

  return (
    <section ref={section} id="como-funciona" className={s.story} data-step={step} style={{ "--p": 0, "--f": 0 } as CSSProperties} aria-labelledby="story-title">
      <div className={s.storySticky}>
        <i className={s.storyGlow} aria-hidden="true" />

        <div className={s.storyCopy}>
          <span className={s.kicker}>CÓMO FUNCIONA</span>
          <h2 id="story-title">Una idea entra. <em>Publicidad sale.</em></h2>
          <ol className={s.storySteps}>
            {STEPS.map(({ label, title, text }, index) => (
              <li key={label} data-active={index === step} data-done={index < step}>
                <span>0{index + 1} · {label}</span>
                <b>{title}</b>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className={s.storyStage}>
          <figure className={`${s.storyGhost} ${s.storyGhostSquare}`} aria-hidden="true">
            <Image src={MEDIA.perro.image} alt="" fill sizes="220px" />
            <figcaption>1:1</figcaption>
          </figure>
          <figure className={`${s.storyGhost} ${s.storyGhostPortrait}`} aria-hidden="true">
            <Image src={MEDIA.perro.image} alt="" fill sizes="240px" />
            <figcaption>4:5</figcaption>
          </figure>

          <div className={s.storyFrame}>
            <div className={s.storyClip}>
              <Image className={s.storyImage} src={MEDIA.perro.image} alt={MEDIA.perro.alt} fill unoptimized />
              <LandingVideo className={s.storyVideo} src={MEDIA.perro.video} poster={posterOf("perro")} label="El mismo anuncio convertido en video" active={step === 2} />
              <i className={s.storyGuides} aria-hidden="true" />
            </div>
            <span className={s.storyTag} key={step}>{step === 0 ? "Tu producto" : step === 1 ? "Dirección creativa" : "Imagen + video"}</span>
          </div>

          <ul className={s.storyChips} aria-hidden="true">
            <li><small>Ángulo</small>Beneficio principal</li>
            <li><small>Estilo</small>Lifestyle</li>
            <li><small>Formato</small>9:16</li>
          </ul>
        </div>

        <div className={s.storyProgress} aria-hidden="true"><i /></div>
      </div>
    </section>
  )
}
