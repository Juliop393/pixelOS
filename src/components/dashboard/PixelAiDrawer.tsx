"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import PixelAdvisor, { type PixelAiInitialRequest, type Recommendation } from "./PixelAdvisor"

export default function PixelAiDrawer({
  open,
  onOpenChange,
  initialRequest,
  onApplyRecommendation,
  focusMode = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRequest?: PixelAiInitialRequest | null
  onApplyRecommendation?: (recommendation: Recommendation) => void
  focusMode?: boolean
}) {
  const [accessToken, setAccessToken] = useState<string>()

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setAccessToken(session?.access_token)
    })

    return () => { active = false }
  }, [])

  return (
    <PixelAdvisor
      accessToken={accessToken}
      hideBubble
      open={open}
      onOpenChange={onOpenChange}
      initialRequest={initialRequest}
      onApplyRecommendation={onApplyRecommendation}
      focusMode={focusMode}
    />
  )
}
