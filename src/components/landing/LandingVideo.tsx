"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Decorative ad loop that stays cheap: nothing is requested until it is near the
 * viewport, it only plays while visible, and a small budget caps how many run at once.
 * With reduced motion or Data Saver it stays on its poster.
 */
const running = new Set<HTMLVideoElement>()

const budget = () => (window.matchMedia("(max-width: 760px)").matches ? 1 : 3)

function canPlay() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return !connection?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function start(video: HTMLVideoElement) {
  if (!running.has(video) && running.size >= budget()) {
    const oldest = running.values().next().value
    if (oldest) {
      oldest.pause()
      running.delete(oldest)
    }
  }
  running.add(video)
  void video.play().catch(() => running.delete(video))
}

function stop(video: HTMLVideoElement) {
  video.pause()
  running.delete(video)
}

export default function LandingVideo({ src, poster, label, className, mode = "inview", active, deferred = false, manual = false, onEnded }: {
  src: string
  poster: string
  label: string
  className?: string
  /** inview: plays while on screen. hover: plays while the closest [data-video-host] is hovered. */
  mode?: "inview" | "hover"
  /** When defined, the parent decides if it should play (still only while on screen). */
  active?: boolean
  /** Waits for the page to finish loading before requesting the file (above the fold). */
  deferred?: boolean
  /**
   * The parent shows a play/pause control and passes the choice as `active`. An explicit
   * play then overrides reduced motion and Data Saver (the parent starts those users
   * paused), and nothing is downloaded while paused.
   */
  manual?: boolean
  /** Plays once and reports the end instead of looping (lets a showcase advance). */
  onEnded?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)
  const visible = useRef(false)
  const isNear = useRef(false)
  const wanted = useRef(active ?? true)

  useEffect(() => {
    const video = ref.current
    if (!video || !(manual || canPlay())) return

    const load = () => { if (!manual || wanted.current) setLoaded(true) }
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      near.disconnect()
      isNear.current = true
      if (deferred && document.readyState !== "complete") window.addEventListener("load", load, { once: true })
      else load()
    }, { rootMargin: "320px 0px" })
    near.observe(video)

    const sync = () => {
      if (mode === "inview" && visible.current && wanted.current && !document.hidden) start(video)
      else if (mode === "inview") stop(video)
    }

    const seen = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting
      if (!entry.isIntersecting && mode === "hover") stop(video)
      sync()
    }, { threshold: 0.35 })
    seen.observe(video)

    document.addEventListener("visibilitychange", sync)

    const host = video.closest<HTMLElement>("[data-video-host]")
    const enter = () => { setLoaded(true); start(video) }
    const leave = () => stop(video)
    const hoverable = mode === "hover" && window.matchMedia("(hover: hover)").matches
    if (hoverable) {
      host?.addEventListener("mouseenter", enter)
      host?.addEventListener("mouseleave", leave)
    }

    return () => {
      near.disconnect()
      seen.disconnect()
      window.removeEventListener("load", load)
      document.removeEventListener("visibilitychange", sync)
      host?.removeEventListener("mouseenter", enter)
      host?.removeEventListener("mouseleave", leave)
      stop(video)
    }
  }, [deferred, mode, manual])

  // The source arrives after the visibility check: start as soon as it can.
  useEffect(() => {
    const video = ref.current
    if (video && loaded && mode === "inview" && visible.current && wanted.current) start(video)
  }, [loaded, mode])

  useEffect(() => {
    if (active === undefined) return
    wanted.current = active
    const video = ref.current
    if (!video || !(manual || canPlay())) return
    // A manual play loads the file only once it is near the viewport.
    if (active && manual && isNear.current && !loaded) setLoaded(true)
    if (active && visible.current && loaded) start(video)
    else if (!active) stop(video)
  }, [active, loaded, manual])

  return <video
    ref={ref}
    className={className}
    src={loaded ? src : undefined}
    poster={poster}
    muted
    loop={!onEnded}
    onEnded={onEnded}
    playsInline
    preload="none"
    aria-label={label}
  />
}
