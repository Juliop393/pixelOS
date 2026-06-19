"use client"

import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface TopbarProps {
  credits: number
}

export default function Topbar({ credits }: TopbarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="h-16 bg-[#1E1C1A]/80 backdrop-blur-xl border-b border-[#3A3833] sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#E8E6E1]">Generador de Ángulos</h1>
          <p className="text-xs text-[#9A9893]">Crea creativos publicitarios con IA</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2A2826] border border-[#3A3833]">
            <span className="text-sm">⚡</span>
            <span className="text-sm font-semibold text-[#E8E6E1] tabular-nums">
              {credits.toLocaleString()} Créditos
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs text-[#9A9893] hover:text-[#E8E6E1] transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
