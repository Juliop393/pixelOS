"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { useCredits } from "@/lib/credits-context"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const { setCredits, setUserId } = useCredits()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setChecked(true)
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const uid = session.user.id
      setUserId(uid)

      // Buscamos el registro de créditos del usuario.
      const { data: existing } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", uid)
        .maybeSingle()

      if (existing) {
        setCredits(existing.credits ?? 0)
      } else {
        // No existe: lo creamos con 0 créditos (hasta que compre un plan).
        await supabase.from("user_credits").insert({ user_id: uid, credits: 0 })
        setCredits(0)
      }

      setChecked(true)
    }

    init()
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
