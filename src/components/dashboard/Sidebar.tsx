"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

interface SidebarProps {
  userEmail: string | null
}

const navItems = [
  {
    label: "Generador de Ángulos",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: "Identidad de Marca",
    href: "/dashboard/campanas",
    icon: (
      <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    label: "Mis Creativos",
    href: "/dashboard/assets",
    icon: (
      <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Configuración",
    href: "/dashboard/configuracion",
    icon: (
      <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()

  const displayName = userEmail ? userEmail.split("@")[0] : "Usuario Beta"
  const avatarLetter = (displayName[0] ?? "U").toUpperCase()
  const emailLabel = userEmail ?? "user@afmstudio.com"

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#2A2826] border-r border-[#3A3833] flex flex-col">
      <div className="px-6 py-5 border-b border-[#3A3833]">
        <div className="flex items-center gap-3">
          <Image src="/logo_PixelOS.png" width={32} height={32} alt="PixelOS" />
          <div>
            <span className="font-semibold text-[#E8E6E1] tracking-tight block">
              PixelOS
            </span>
            <span className="text-xs text-[#9A9893]">Creative AI</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#D97757] text-white"
                  : "text-[#9A9893] hover:bg-[#1E1C1A] hover:text-[#E8E6E1]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#3A3833]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#1E1C1A] transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[#D97757] text-white flex items-center justify-center text-sm font-semibold">
            {avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#E8E6E1] truncate">{displayName}</p>
            <p className="text-xs text-[#9A9893] truncate">{emailLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
