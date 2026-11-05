"use client"

import { useEffect, useRef } from "react"
import s from "./Landing.module.css"

/**
 * Ambient hero backdrop: two silk-like ribbons of light that rise along the sides
 * and frame the headline, plus a few drifting sparks. Plain canvas 2D, no dependencies.
 *
 * It stays cheap by design: 30 fps cap, capped pixel ratio, and the loop only runs
 * while the hero is on screen and the tab is visible. Phones, reduced motion and
 * Data Saver get one static frame.
 */
type Ribbon = {
  lines: number
  base: number
  lift: number
  amplitude: number
  spread: number
  speed: number
  phase: number
  color: string
  alpha: number
}

const RIBBONS: Ribbon[] = [
  { lines: 52, base: 0.76, lift: 0.56, amplitude: 0.06, spread: 0.34, speed: 0.2, phase: 0, color: "236, 136, 96", alpha: 0.34 },
  { lines: 34, base: 0.7, lift: 0.4, amplitude: 0.045, spread: 0.22, speed: -0.15, phase: 2.2, color: "246, 222, 198", alpha: 0.13 },
]

const SPARKS = Array.from({ length: 64 }, (_, index) => {
  // Deterministic scatter: stable between renders, no hydration concerns.
  const hash = (seed: number) => {
    const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
    return value - Math.floor(value)
  }
  return { x: hash(1), y: hash(2), size: 0.6 + hash(3) * 1.3, speed: 0.006 + hash(4) * 0.014, phase: hash(5) * 6.28 }
})

const STEP = 14
const FRAME = 1000 / 30

export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const compact = window.matchMedia("(max-width: 760px)").matches
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const animated = !compact && !connection?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    let pointerX = 0
    let pointerY = 0
    let driftX = 0
    let driftY = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const ribbonY = (ribbon: Ribbon, x: number, u: number, time: number) => {
      const nx = x / width
      const edge = (nx - 0.5) * 2
      const t = time * ribbon.speed
      const curve = height * ribbon.base - height * ribbon.lift * edge * edge
      const wave = height * ribbon.amplitude * (
        Math.sin(nx * 5.2 + t + u * 1.9 + ribbon.phase) * (0.35 + u * 0.65) +
        Math.sin(nx * 11 - t * 0.7 + u * 3.4) * 0.45
      )
      // The spread crosses zero along the line, which is what pinches it into silk.
      const twist = Math.sin(nx * 3.1 + t * 0.6 + ribbon.phase)
      return curve + wave + (u - 0.5) * height * ribbon.spread * (0.25 + 0.75 * twist)
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = "lighter"

      context.save()
      context.translate(driftX * 14, driftY * 10)

      for (const ribbon of RIBBONS) {
        // Lines fade at the far edges and thin out towards the centre.
        const stroke = context.createLinearGradient(0, 0, width, 0)
        stroke.addColorStop(0, `rgba(${ribbon.color}, .12)`)
        stroke.addColorStop(0.2, `rgba(${ribbon.color}, 1)`)
        stroke.addColorStop(0.5, `rgba(${ribbon.color}, .42)`)
        stroke.addColorStop(0.8, `rgba(${ribbon.color}, 1)`)
        stroke.addColorStop(1, `rgba(${ribbon.color}, .12)`)
        context.strokeStyle = stroke

        const lines = compact ? Math.round(ribbon.lines * 0.55) : ribbon.lines
        for (let line = 0; line < lines; line += 1) {
          const u = line / (lines - 1)
          // Brighter through the middle of the ribbon, softer at its borders.
          const strength = ribbon.alpha * (0.28 + 0.72 * Math.sin(u * Math.PI))
          context.beginPath()
          for (let x = -STEP; x <= width + STEP; x += STEP) {
            const y = ribbonY(ribbon, x, u, time)
            if (x === -STEP) context.moveTo(x, y)
            else context.lineTo(x, y)
          }
          context.globalAlpha = strength
          context.lineWidth = 1
          context.stroke()
          // A wide, faint pass on some lines gives the ribbon body without a blur filter.
          if (line % 4 === 0) {
            context.globalAlpha = strength * 0.13
            context.lineWidth = 16
            context.stroke()
          }
        }
      }

      context.restore()

      for (const spark of SPARKS) {
        const rise = (spark.y + time * spark.speed) % 1
        const y = height * (0.9 - rise * 0.82)
        const twinkle = 0.5 + 0.5 * Math.sin(time * 0.9 + spark.phase)
        context.globalAlpha = 0.5 * twinkle * Math.sin(rise * Math.PI)
        context.fillStyle = "rgb(255, 214, 188)"
        context.beginPath()
        context.arc(spark.x * width + driftX * 22, y + driftY * 14, spark.size, 0, 6.2832)
        context.fill()
      }

      context.globalAlpha = 1
    }

    resize()
    draw(8)
    canvas.dataset.ready = ""

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        resize()
        if (!animated) draw(8)
      }, 150)
    }
    window.addEventListener("resize", onResize)

    if (!animated) {
      return () => {
        window.clearTimeout(resizeTimer)
        window.removeEventListener("resize", onResize)
      }
    }

    let frame = 0
    let last = 0
    let onScreen = true

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - last < FRAME) return
      last = now
      driftX += (pointerX - driftX) * 0.05
      driftY += (pointerY - driftY) * 0.05
      draw(8 + now / 1000)
    }

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (onScreen && !document.hidden) frame = requestAnimationFrame(tick)
    }

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    })
    visibility.observe(canvas)
    document.addEventListener("visibilitychange", sync)

    const onPointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5
      pointerY = event.clientY / window.innerHeight - 0.5
    }
    window.addEventListener("pointermove", onPointer, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(resizeTimer)
      visibility.disconnect()
      document.removeEventListener("visibilitychange", sync)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointer)
    }
  }, [])

  return <canvas ref={canvasRef} className={s.heroField} aria-hidden="true" />
}
