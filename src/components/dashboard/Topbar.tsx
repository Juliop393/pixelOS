"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"

const navItems = [
  {
    label: "Generador",
    href: "/dashboard",
    icon: (
      <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: "Identidad",
    href: "/dashboard/campanas",
    icon: (
      <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    label: "Mis Creativos",
    href: "/dashboard/assets",
    icon: (
      <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Configuración",
    href: "/dashboard/configuracion",
    icon: (
      <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Perfil",
    href: "/dashboard/perfil",
    icon: (
      <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { credits } = useCredits()
  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserEmail(user.email ?? "")
      setFullName(
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : ""
      )
    }

    loadUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const displayName = fullName || userEmail.split("@")[0] || "Usuario"
  const avatarLetter = (displayName[0] ?? "U").toUpperCase()

  return (
    <header className="px-3 pt-3 z-40 flex-shrink-0">
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-2.5 gap-4"
        style={{
          background: "rgba(26,26,26,0.85)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          border: "1px solid #3A3833",
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        }}
      >
        {/* Lado izquierdo: logo + navegación */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <img
              src="/logo_PixelOS.png"
              width={32}
              height={32}
              alt="PixelFM"
            />
            <span className="font-semibold text-[#F5F0E8] tracking-tight text-sm">
              PixelFM
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#D97757]/15 text-[#D97757]"
                      : "text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/40"
                  }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Lado derecho: créditos + recargar + usuario + logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/pricing"
            aria-label="Ver planes y comprar créditos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2A2826] border border-[#3A3833] hover:border-[#D97757]/60 hover:bg-[#D97757]/10 transition-colors"
          >
            <span className="text-xs">⚡</span>
            <span className="text-xs font-semibold text-[#F5F0E8] tabular-nums">
              {credits.toLocaleString()}
            </span>
          </Link>

          <Link
            href="/pricing"
            className="text-xs font-medium text-[#D97757] hover:text-[#E18A6E] transition-colors hidden xl:inline"
          >
            Recargar
          </Link>

          <div className="w-px h-6 bg-[#3A3833]" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#D97757] text-white flex items-center justify-center text-xs font-semibold">
              {avatarLetter}
            </div>
            <span className="text-xs font-medium text-[#F5F0E8] max-w-[100px] truncate hidden xl:inline">
              {displayName}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs text-[#9CA3AF] hover:text-[#F5F0E8] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#3A3833]/40"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}