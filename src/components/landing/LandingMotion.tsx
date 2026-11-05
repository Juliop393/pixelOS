"use client"

import { useEffect } from "react"

/** One small driver for the whole page: reveal on enter + subtle scroll parallax. */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.getElementById("top")
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    root.dataset.motion = "on"

    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.setAttribute("data-revealed", "")
        reveal.unobserve(entry.target)
      })
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" })
    root.querySelectorAll("[data-reveal]").forEach((element) => reveal.observe(element))

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"))
    let frame = 0
    const paint = () => {
      frame = 0
      const middle = window.innerHeight / 2
      layers.forEach((layer) => {
        const box = layer.getBoundingClientRect()
        if (box.bottom < -200 || box.top > window.innerHeight + 200) return
        const offset = (box.top + box.height / 2 - middle) * Number(layer.dataset.parallax)
        layer.style.setProperty("--py", `${offset.toFixed(1)}px`)
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    paint()

    return () => {
      reveal.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [])

  return null
}
