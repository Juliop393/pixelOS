"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

interface Mouse {
  x: number | null
  y: number | null
}

export default function SimpleParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const particleCount = 60
    const maxDistance = 120
    const mouseRepulseRadius = 80
    const mouse: Mouse = { x: null, y: null }

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }))

    let animationId: number

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const onMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    window.addEventListener("resize", resize)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseout", onMouseLeave)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        if (mouse.x !== null && mouse.y !== null) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < mouseRepulseRadius && dist > 0) {
            const force = (mouseRepulseRadius - dist) / mouseRepulseRadius
            p.x += (dx / dist) * force * 1.5
            p.y += (dy / dist) * force * 1.5
          }
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
        p.x = Math.max(0, Math.min(width, p.x))
        p.y = Math.max(0, Math.min(height, p.y))

        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(232,114,74,0.4)"
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDistance) {
            const opacity = 0.08 * (1 - dist / maxDistance)
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(232,114,74,${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseout", onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  )
}