"use client"

import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { getPaddle } from "@/components/PaddleProvider"
import styles from "@/components/PricingPlans.module.css"

interface PricingButtonProps {
  priceId: string
  planName: string
  highlighted: boolean
}

export default function PricingButton({ priceId, planName, highlighted }: PricingButtonProps) {
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

    const userId = session.user.id
    const userEmail = session.user.email ?? ""

    const paddle = getPaddle()
    if (!paddle) {
      console.error("Paddle no inicializado")
      return
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: userEmail },
      customData: { user_id: userId },
      settings: {
        successUrl: "https://pixelfm.com/dashboard",
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.cta} ${highlighted ? styles.ctaFeatured : ""}`}
    >
      <span>Elegir {planName}</span>
      <svg width={15} height={15} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
    </button>
  )
}
