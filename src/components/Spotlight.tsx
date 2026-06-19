"use client"

import { useEffect, useRef } from "react"

export default function Spotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animationFrame: number
    let mouseX = 0
    let mouseY = 0
    let currentX = 0
    let currentY = 0

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const animate = () => {
      if (spotlightRef.current) {
        const speed = 0.08
        currentX += (mouseX - currentX) * speed
        currentY += (mouseY - currentY) * speed

        spotlightRef.current.style.transform = `translate(${currentX}px, ${currentY}px)`
      }
      animationFrame = requestAnimationFrame(animate)
    }

    window.addEventListener("mousemove", handleMouseMove)
    animationFrame = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div
      ref={spotlightRef}
      className="fixed top-0 left-0 w-[600px] h-[600px] pointer-events-none z-0 opacity-30"
      style={{
        background: "radial-gradient(circle, rgba(217,119,87,0.15) 0%, rgba(217,119,87,0.05) 30%, transparent 70%)",
        transform: "translate(-50%, -50%)",
        filter: "blur(60px)",
      }}
    />
  )
}
