"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Generador de Ángulos",
  "/dashboard/campanas": "Identidad de Marca",
  "/dashboard/assets": "Mis Creativos",
  "/dashboard/configuracion": "Configuración",
  "/dashboard/perfil": "Mi Perfil",
  "/dashboard/pricing": "Planes y créditos",
}

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { credits } = useCredits()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const pageTitle = PAGE_TITLES[pathname] || "Generador de Ángulos"

  return (
    <header className="h-16 bg-[#1E1C1A]/80 backdrop-blur-xl border-b border-[#3A3833] sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#E8E6E1]">{pageTitle}</h1>
          <p className="text-xs text-[#9A9893]">Crea creativos publicitarios con IA</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            aria-label="Ver planes y comprar créditos"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2A2826] border border-[#3A3833] hover:border-[#D97757]/60 hover:bg-[#D97757]/10 transition-colors"
          >
            <span className="text-sm">⚡</span>
            <span className="text-sm font-semibold text-[#E8E6E1] tabular-nums">
              {credits.toLocaleString()} Créditos
            </span>
          </Link>

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
