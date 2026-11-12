"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import LandingVideo from "./LandingVideo"
import { CAMPAIGNS, FEATURED_CAMPAIGNS, MEDIA, posterOf } from "./landing-data"
import s from "./Landing.module.css"
import c from "./LandingShowcase.module.css"

const pad = (n: number) => String(n).padStart(2, "0")

/*
 * One campaign on stage at a time: its image beside the video made from it. The video
 * plays muted while the stage is on screen and, until the visitor picks a campaign,
 * hands over to the next one when it ends. Only the stage video is ever downloaded.
 */
export default function LandingShowcase() {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [auto, setAuto] = useState(true)

  // Reduced motion and Data Saver start paused: the visitor can still press play.
  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false)
      setAuto(false)
    }
  }, [])

  const key = CAMPAIGNS[index]
  const campaign = MEDIA[key]
  const go = (next: number) => {
    setAuto(false)
    setIndex((next + CAMPAIGNS.length) % CAMPAIGNS.length)
  }

  return (
    <section id="ejemplos" className={`${s.section} ${c.showcase}`} aria-labelledby="library-title">
      <header className={s.intro} data-reveal>
        <span className={s.kicker}>CAMPAÑAS REALES</span>
        <h2 id="library-title">Autos, tecnología, mascotas. <em>Un solo estudio.</em></h2>
        <p>Cada campaña es una imagen y el video creado a partir de ella, con PixelFM. Todo lo que generas queda en tu biblioteca, listo para volver a usar.</p>
      </header>

      <div className={c.stage} data-reveal>
        <div className={c.media}>
          <figure className={c.image}>
            <Image key={key} src={campaign.image} alt={campaign.alt} fill sizes="(max-width: 760px) 36vw, 250px" />
            <figcaption>Imagen</figcaption>
          </figure>

          <figure className={c.video}>
            <LandingVideo
              key={key}
              className={c.videoEl}
              src={campaign.video}
              poster={posterOf(key, 750)}
              label={`Video: ${campaign.alt}`}
              manual
              active={playing}
              onEnded={auto ? () => setIndex((current) => (current + 1) % CAMPAIGNS.length) : undefined}
            />
            <figcaption><i aria-hidden="true" />Video</figcaption>
            <button
              type="button"
              className={c.toggle}
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "Pausar video" : "Reproducir video"}
            >
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
          </figure>
        </div>

        <div className={c.info}>
          <p className={c.counter}><b>{pad(index + 1)}</b> / {pad(CAMPAIGNS.length)}</p>
          <div aria-live="polite">
            <span className={c.category}>{campaign.category}</span>
            <h3>{campaign.title}</h3>
          </div>
          <p className={c.pair}>La imagen y su video, de la misma campaña. Formato 9:16, listo para Stories y Reels.</p>
          <div className={c.nav}>
            <button type="button" onClick={() => go(index - 1)} aria-label="Campaña anterior"><ArrowLeft aria-hidden="true" /></button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Campaña siguiente"><ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      <ul className={c.rail} aria-label="Campañas">
        {CAMPAIGNS.map((item, position) => (
          <li key={item}>
            <button type="button" onClick={() => go(position)} aria-pressed={position === index} aria-label={`Ver campaña: ${MEDIA[item].title}`}>
              <span className={c.thumb}>
                <Image src={MEDIA[item].image} alt="" fill sizes="(max-width: 760px) 96px, 128px" />
                {FEATURED_CAMPAIGNS.includes(item) && <span className={c.badge}>Destacada</span>}
              </span>
              <small>{MEDIA[item].category}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
