"use client"

import { useId } from "react"
import o from "./PixelAiOrb.module.css"

/* PixelIA's mark: a filled four-point star with a smaller companion, lilac melting into terracotta. */
function PixelAiMark() {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={o.mark} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="4" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f3e6ff" />
          <stop offset="38%" stopColor="#c9a3f0" />
          <stop offset="82%" stopColor="#e98c6a" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="9" cy="9" r="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity=".45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Main star: concave sides drawn with quadratic curves toward the centre. */}
      <path className={o.star} d="M10.5 2.5 Q11.4 9.6 18.5 10.5 Q11.4 11.4 10.5 18.5 Q9.6 11.4 2.5 10.5 Q9.6 9.6 10.5 2.5 Z" fill={`url(#${id}-fill)`} />
      <path d="M10.5 2.5 Q11.4 9.6 18.5 10.5 Q11.4 11.4 10.5 18.5 Q9.6 11.4 2.5 10.5 Q9.6 9.6 10.5 2.5 Z" fill={`url(#${id}-shine)`} />
      <path className={o.spark} d="M18 13.5 Q18.45 16.55 21.5 17 Q18.45 17.45 18 20.5 Q17.55 17.45 14.5 17 Q17.55 16.55 18 13.5 Z" fill="#ec9a78" />
      <circle className={o.dot} cx="18.6" cy="4.6" r="1.1" fill="#d9c2f5" />
    </svg>
  )
}

/* PixelIA's entry point: a small glass sphere beside the topbar, on every dashboard page. */
export default function PixelAiOrb({ open, onToggle, compact = false, className = "" }: {
  open: boolean
  onToggle: () => void
  compact?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`${o.orb} ${compact ? o.compact : ""} ${open ? o.open : ""} ${className}`}
      onClick={onToggle}
      aria-label={open ? "Cerrar PixelIA" : "Abrir PixelIA, asistente creativo con IA"}
      aria-expanded={open}
      aria-controls="pixel-ai-panel"
    >
      <span className={o.ring} aria-hidden="true" />
      <span className={o.core} aria-hidden="true">
        <PixelAiMark />
      </span>
      {!compact && <span className={o.label} aria-hidden="true"><b>PixelIA</b><small>{open ? "Abierto" : "Asistente IA"}</small></span>}
    </button>
  )
}
