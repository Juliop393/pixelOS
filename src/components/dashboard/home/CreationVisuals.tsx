"use client"

import { useEffect, useRef } from "react"
import styles from "@/components/dashboard/DashboardHome.module.css"

/**
 * Decorative, purely visual previews for the "Crear imagen" / "Crear video" cards.
 * The only interactivity is a pointer-driven tilt on fine pointers; everything
 * else is CSS transitions keyed off the parent card's :hover.
 */
function usePointerTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const stage = ref.current
    const card = stage?.closest("a")
    if (!stage || !card) return

    const canTilt = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)")
    let frame = 0

    const reset = () => {
      cancelAnimationFrame(frame)
      stage.style.setProperty("--mx", "0")
      stage.style.setProperty("--my", "0")
    }

    const onMove = (event: PointerEvent) => {
      if (!canTilt.matches) return
      const rect = stage.getBoundingClientRect()
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1))
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        stage.style.setProperty("--mx", x.toFixed(3))
        stage.style.setProperty("--my", y.toFixed(3))
      })
    }

    card.addEventListener("pointermove", onMove)
    card.addEventListener("pointerleave", reset)
    return () => {
      card.removeEventListener("pointermove", onMove)
      card.removeEventListener("pointerleave", reset)
      cancelAnimationFrame(frame)
    }
  }, [])

  return ref
}

/** A 4:5 ad being composed: backdrop, product, headline, CTA and a floating strategy chip. */
export function ImageCreationVisual() {
  const ref = usePointerTilt<HTMLSpanElement>()

  return (
    <span ref={ref} className={styles.imageStage} aria-hidden="true">
      <span className={styles.stageGlow} />
      <span className={styles.adRig}>
        <span className={styles.adBack} />
        <span className={styles.adCard}>
          <span className={styles.adBackdrop} />
          <span className={styles.adOrb} />
          <span className={styles.adCopy}>
            <b />
            <b />
          </span>
          <span className={styles.adProduct}>
            <i />
          </span>
          <span className={styles.adFloor} />
          <span className={styles.adCta}>Comprar</span>
          <b className={styles.adRatio}>4:5</b>
          <span className={styles.adSheen} />
        </span>
        <span className={styles.adChip}>
          <i />
          Hook · Beneficio
        </span>
      </span>
    </span>
  )
}

/** A mini scene-based editor: 9:16 preview, scene list and a 3-chunk timeline with playhead. */
export function VideoCreationVisual() {
  const ref = usePointerTilt<HTMLSpanElement>()

  return (
    <span ref={ref} className={styles.videoStage} aria-hidden="true">
      <span className={styles.stageGlow} />
      <span className={styles.vidWindow}>
        <span className={styles.vidTop}>
          <span className={styles.vidPreview}>
            <span className={styles.vidScene} data-scene="1" />
            <span className={styles.vidScene} data-scene="2" />
            <span className={styles.vidScene} data-scene="3" />
            <span className={styles.vidProgress}><b /><b /><b /></span>
            <span className={styles.vidPlay}><i /></span>
            <span className={styles.vidCaption}><b /><b /></span>
          </span>

          <span className={styles.vidScenes}>
            <span data-scene="1"><small>01</small><b>Hook</b></span>
            <span data-scene="2"><small>02</small><b>Demo</b></span>
            <span data-scene="3"><small>03</small><b>CTA</b></span>
          </span>
        </span>

        <span className={styles.vidTimeline}>
          <span className={styles.vidChunks}>
            <i data-scene="1" />
            <i data-scene="2" />
            <i data-scene="3" />
          </span>
          <span className={styles.vidWave}>
            {Array.from({ length: 22 }, (_, index) => <b key={index} />)}
          </span>
          <span className={styles.vidPlayhead} />
        </span>
      </span>
    </span>
  )
}
