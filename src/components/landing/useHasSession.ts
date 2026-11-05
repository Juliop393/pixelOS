"use client"

import { useEffect, useState } from "react"

let check: Promise<boolean> | null = null

/**
 * Whether this browser has a live PixelFM session. The landing is a static page, so
 * this resolves after hydration: everyone first sees the signed-out state.
 * Visitors without an auth cookie never load the Supabase client.
 */
function hasSession() {
  check ??= (async () => {
    if (!document.cookie.includes("-auth-token")) return false
    try {
      const { supabase } = await import("@/lib/supabase")
      const { data: { session } } = await supabase.auth.getSession()
      return Boolean(session)
    } catch {
      return false
    }
  })()
  return check
}

export function useHasSession() {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let active = true
    void hasSession().then((value) => { if (active) setSignedIn(value) })
    return () => { active = false }
  }, [])

  return signedIn
}
