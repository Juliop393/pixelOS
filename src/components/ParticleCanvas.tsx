"use client"
import { useEffect, useRef } from "react"

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const mouse = { x: -1000, y: -1000 }

    const drawCross = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const half = size / 2
      ctx.beginPath()
      ctx.moveTo(x - half, y)
      ctx.lineTo(x + half, y)
      ctx.moveTo(x, y - half)
      ctx.lineTo(x, y + half)
      ctx.strokeStyle = "rgba(232,114,74,0.5)"
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const particles = Array.from({ length: 120 }, (_, i) => {
      const isGlow = i < 7
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: isGlow ? 4 : 3,
        glow: isGlow,
      }
    })

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    window.addEventListener("mousemove", onMouse)

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener("resize", resize)

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 120) {
          p.vx += (dx / dist) * 0.03
          p.vy += (dy / dist) * 0.03
        }

        p.vx *= 0.99
        p.vy *= 0.99
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        if (p.glow) {
          ctx.save()
          ctx.shadowBlur = 8
          ctx.shadowColor = "rgba(232,114,74,0.8)"
          drawCross(ctx, p.x, p.y, p.size)
          ctx.restore()
        } else {
          drawCross(ctx, p.x, p.y, p.size)
        }
      })

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
            const opacity = 0.06 * (1 - dist / 100)
            grad.addColorStop(0, `rgba(232,114,74,${opacity})`)
            grad.addColorStop(1, "rgba(232,114,74,0)")
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = grad
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("mousemove", onMouse)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
    />
  )
}