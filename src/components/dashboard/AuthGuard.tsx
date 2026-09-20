"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const { setCredits, setUserId } = useCredits()

  useEffect(() => {
    let active = true

    const redirectToLogin = () => {
      if (!active) return
      setCredits(0)
      setUserId(null)
      setChecked(false)
      router.replace("/login")
      router.refresh()
    }

    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!active) return

      if (error || !user) {
        redirectToLogin()
        return
      }

      const uid = user.id
      setUserId(uid)

      // Buscamos el registro de créditos del usuario.
      const { data: existing } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", uid)
        .maybeSingle()

      if (!active) return

      setCredits(existing?.credits ?? 0)
      setChecked(true)
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        redirectToLogin()
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router, setCredits, setUserId])

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#1E1C1A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
