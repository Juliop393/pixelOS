"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setChecked(true)
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login")
      } else {
        setChecked(true)
      }
    })
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen bg-[#1E1C1A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}