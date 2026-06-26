"use client"

import { useEffect, useRef } from "react"

export default function GlowCursor() {
  const glowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const glow = glowRef.current
    if (!glow) return

    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY
    let animationId: number

    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    window.addEventListener("mousemove", onMouseMove)

    const animate = () => {
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08

      glow.style.transform = `translate3d(${currentX - 200}px, ${currentY - 200}px, 0)`

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("mousemove", onMouseMove)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(232,114,74,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 1,
        willChange: "transform",
        transform: "translate3d(-200px, -200px, 0)",
      }}
    />
  )
}