"use client"

import { useEffect, useState, ReactNode } from "react"
import { initializePaddle, Paddle } from "@paddle/paddle-js"

let paddleInstance: Paddle | null = null

export function getPaddle(): Paddle | null {
  if (typeof window === "undefined") return null
  return paddleInstance
}

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) {
      console.warn("Falta NEXT_PUBLIC_PADDLE_CLIENT_TOKEN")
      setReady(true)
      return
    }

    initializePaddle({
      environment: "production",
      token,
    }).then((paddle) => {
      if (paddle) {
        paddleInstance = paddle
      }
      setReady(true)
    })
  }, [])

  if (!ready) return null

  return <>{children}</>
}