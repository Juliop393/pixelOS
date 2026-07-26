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
      <svg className="w-[18px] h-[18px]" width={18} height={18} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: "Identidad",
    href: "/dashboard/campanas",
    icon: (
      <svg className="w-[18px] h-[18px]" width={18} height={18} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    label: "Mis Creativos",
    href: "/dashboard/assets",
    icon: (
      <svg className="w-[18px] h-[18px]" width={18} height={18} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Configuración",
    href: "/dashboard/configuracion",
    icon: (
      <svg className="w-[18px] h-[18px]" width={18} height={18} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
    <header className="px-4 pt-4 z-40 flex-shrink-0">
      <div
        className="flex items-center justify-between rounded-[28px] px-6 py-3.5 gap-5 mx-auto max-w-[1200px] relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(217,119,87,0.06) 0%, rgba(217,119,87,0.015) 100%), rgba(30,28,26,0.42)",
          backdropFilter: "blur(20px) saturate(135%)",
          WebkitBackdropFilter: "blur(20px) saturate(135%)",
          border: "1px solid rgba(58,56,51,0.6)",
          boxShadow:
            "inset 0 1px 0 rgba(217,119,87,0.12), inset 0 -1px 0 rgba(217,119,87,0.03), 0 12px 35px rgba(0,0,0,0.28)",
        }}
      >
        {/* Reflejo superior cálido tipo ::before liquid glass */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[40%] rounded-[28px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(217,119,87,0.07) 0%, transparent 100%)",
          }}
        />
        {/* Lado izquierdo: logo + navegación */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <img
              src="/logo_PixelOS.png"
              width={40}
              height={40}
              alt="PixelFM"
            />
            <span className="font-bold text-[#F5F0E8] tracking-tight text-base">
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#D97757] text-white shadow-sm shadow-[#D97757]/40"
                      : "text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/30"
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
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <Link
            href="/pricing"
            aria-label="Ver planes y comprar créditos"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E1C1A]/60 border border-[#3A3833]/50 hover:border-[#D97757]/60 hover:bg-[#D97757]/8 transition-colors"
          >
            <span className="text-sm">⚡</span>
            <span className="text-sm font-semibold text-[#F5F0E8] tabular-nums">
              {credits.toLocaleString()}
            </span>
          </Link>

          <Link
            href="/pricing"
            className="text-sm font-medium text-[#D97757] hover:text-[#E18A6E] transition-colors hidden xl:inline"
          >
            Recargar
          </Link>

          <div className="w-px h-7 bg-[#3A3833]/50" />

          <Link
            href="/dashboard/perfil"
            className="flex items-center gap-2 rounded-xl hover:bg-[#3A3833]/30 transition-colors px-2 py-1"
          >
            <div className="w-8 h-8 rounded-full bg-[#D97757] text-white flex items-center justify-center text-xs font-semibold">
              {avatarLetter}
            </div>
            <span className="text-sm font-medium text-[#F5F0E8] max-w-[110px] truncate hidden xl:inline">
              {displayName}
            </span>
          </Link>

          <button
            onClick={handleSignOut}
            className="text-sm text-[#9CA3AF] hover:text-[#F5F0E8] transition-colors px-3 py-2 rounded-xl hover:bg-[#3A3833]/30"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}