"use client"

import { useEffect, useRef } from "react"
import styles from "./DashboardShell.module.css"

const CELL = 26
const FRAME_MS = 33
const POINTER_RADIUS = 190

/* Each colour owns a broad region of the field, so tones blend across the
   screen instead of reading as confetti. */
const PALETTE = [
  [232, 128, 90],
  [244, 182, 146],
  [222, 164, 96],
  [206, 104, 116],
  [164, 112, 168],
] as const

type Pixel = {
  x: number
  y: number
  size: number
  phase: number
  speed: number
  rgb: string
}

const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export default function DashboardBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let pixels: Pixel[] = []
    let width = 0
    let height = 0
    let frame = 0
    let last = 0
    let pointerX = -9999
    let pointerY = -9999

    const build = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      pixels = []
      for (let row = 0; row * CELL < height + CELL; row += 1) {
        for (let col = 0; col * CELL < width + CELL; col += 1) {
          if (hash(col, row) > 0.46) continue

          const x = col * CELL
          const y = row * CELL
          const region = Math.sin(x * 0.0021 + 1.3) + Math.cos(y * 0.0034 - x * 0.0012)
          const index = Math.floor(((region + 2) / 4) * PALETTE.length)
          const seed = hash(row + 7, col + 3)

          pixels.push({
            x,
            y,
            size: seed > 0.82 ? 4 : seed > 0.4 ? 3 : 2,
            phase: seed * Math.PI * 2,
            speed: 0.0005 + hash(col + 11, row + 5) * 0.0011,
            rgb: PALETTE[Math.min(index, PALETTE.length - 1)].join(","),
          })
        }
      }
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      for (const pixel of pixels) {
        // Two slow crossing waves of light travel through the grid.
        const a = 0.5 + 0.5 * Math.sin(pixel.x * 0.0042 + pixel.y * 0.0066 - time * 0.00028)
        const b = 0.5 + 0.5 * Math.sin(pixel.x * 0.0058 - pixel.y * 0.0031 + time * 0.0002)
        const twinkle = 0.55 + 0.45 * Math.sin(time * pixel.speed + pixel.phase)
        const band = Math.pow(a * 0.6 + b * 0.4, 3)

        const dx = pixel.x - pointerX
        const dy = pixel.y - pointerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const near = distance < POINTER_RADIUS ? 1 - distance / POINTER_RADIUS : 0

        const alpha = 0.07 + band * twinkle * 0.62 + near * near * 0.4
        ctx.fillStyle = `rgba(${pixel.rgb},${Math.min(alpha, 0.85).toFixed(3)})`
        ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size)
      }
    }

    const loop = (time: number) => {
      frame = requestAnimationFrame(loop)
      if (time - last < FRAME_MS) return
      last = time
      draw(time)
    }

    const handleResize = () => {
      build()
      if (reducedMotion) draw(12000)
    }

    const handlePointer = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
    }

    build()
    draw(reducedMotion ? 12000 : performance.now())
    window.addEventListener("resize", handleResize)
    if (!reducedMotion) {
      window.addEventListener("pointermove", handlePointer, { passive: true })
      frame = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("pointermove", handlePointer)
    }
  }, [])

  return <canvas ref={canvasRef} className={styles.backdrop} aria-hidden="true" />
}
