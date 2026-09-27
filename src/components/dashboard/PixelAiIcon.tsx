"use client"

import { useId } from "react"
import { Sparkles, type LucideProps } from "lucide-react"

/** Existing sparkle silhouette, softly lit in PixelIA's restrained aurora palette. */
export default function PixelAiIcon(props: LucideProps) {
  const gradientId = `pixel-ai-${useId().replace(/:/g, "")}`
  return <Sparkles {...props} stroke={`url(#${gradientId})`}>
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--pf-ai-blue)" />
        <stop offset="55%" stopColor="var(--pf-ai-violet)" />
        <stop offset="100%" stopColor="var(--pf-ai-cyan)" />
      </linearGradient>
    </defs>
  </Sparkles>
}
