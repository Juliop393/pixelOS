"use client"

import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

interface PricingButtonProps {
  variantId: string
  planName: string
  highlighted: boolean
}

export default function PricingButton({ planName, highlighted }: PricingButtonProps) {
  const router = useRouter()

  const handleClick = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      router.push("/register")
      return
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push("/register")
      return
    }

    alert("Pagos próximamente")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`block w-full text-center text-sm font-semibold px-4 py-3.5 rounded-xl transition-all duration-200 ${
        highlighted
          ? "bg-[#D97757] text-white hover:bg-[#C26547] shadow-lg shadow-[#D97757]/20"
          : "bg-[#1E1C1A]/60 backdrop-blur-sm text-[#E8E6E1] hover:bg-[#D97757] hover:text-white border border-[#3A3833]/50"
      }`}
    >
      Elegir {planName}
    </button>
  )
}