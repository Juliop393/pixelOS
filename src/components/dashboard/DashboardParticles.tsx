"use client"

import { useEffect, useRef } from "react"

const PARTICLE_COUNT = 28
const PARTICLE_COLOR = "217, 119, 87"

export default function DashboardParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let animationId: number
    let width = 0
    let height = 0

    type Particle = {
      x: number
      y: number
      size: number
      opacity: number
      speedY: number
      driftX: number
      phase: number
    }

    let particles: Particle[] = []

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width
      canvas.height = height
    }

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2,
        opacity: 0.12 + Math.random() * 0.22,
        speedY: 0.08 + Math.random() * 0.18,
        driftX: (Math.random() - 0.5) * 0.06,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.y -= p.speedY
        p.x += p.driftX + Math.sin(p.phase) * 0.15
        p.phase += 0.005

        if (p.y < -5) {
          p.y = height + 5
          p.x = Math.random() * width
        }
        if (p.x < -5) p.x = width + 5
        if (p.x > width + 5) p.x = -5

        const flicker = 0.85 + Math.sin(p.phase * 2) * 0.15
        const alpha = p.opacity * flicker

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${PARTICLE_COLOR}, ${alpha})`
        ctx.fill()

        // Sutil halo difuso
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${PARTICLE_COLOR}, ${alpha * 0.18})`
        ctx.fill()
      }

      if (prefersReducedMotion) return
      animationId = requestAnimationFrame(draw)
    }

    resize()
    initParticles()
    draw()

    if (!prefersReducedMotion) {
      window.addEventListener("resize", () => {
        resize()
        initParticles()
      })
    }

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  )
}