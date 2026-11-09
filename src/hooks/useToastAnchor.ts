"use client"

import { useCallback, useEffect, useState } from "react"

/*
 * Keeps the global toasts just below a page's header. The element given the
 * returned ref publishes its real bottom edge as --pf-toast-top on <html>,
 * which the Toaster in app/layout.tsx uses as its top offset. Pages without
 * an anchor (or after it unmounts) fall back to Sonner's default offset.
 *
 * A callback ref, so it also works for elements that render after a loading state.
 */

const TOAST_TOP_VAR = "--pf-toast-top"
const GAP_BELOW_ANCHOR = 12

export function useToastAnchor<T extends HTMLElement>() {
  const [anchor, setAnchor] = useState<T | null>(null)
  const ref = useCallback((node: T | null) => setAnchor(node), [])

  useEffect(() => {
    if (!anchor) return

    const root = document.documentElement
    let frame = 0

    const update = () => {
      frame = 0
      // A header scrolled out of view no longer needs room above the toasts.
      const bottom = Math.max(0, Math.round(anchor.getBoundingClientRect().bottom))
      root.style.setProperty(TOAST_TOP_VAR, `${bottom + GAP_BELOW_ANCHOR}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    const observer = new ResizeObserver(schedule)
    observer.observe(anchor)
    window.addEventListener("resize", schedule)
    window.addEventListener("scroll", schedule, { passive: true, capture: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", schedule)
      window.removeEventListener("scroll", schedule, { capture: true })
      root.style.removeProperty(TOAST_TOP_VAR)
    }
  }, [anchor])

  return ref
}
