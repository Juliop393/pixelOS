"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface CreditsContextType {
  credits: number
  setCredits: React.Dispatch<React.SetStateAction<number>>
  userId: string | null
  setUserId: React.Dispatch<React.SetStateAction<string | null>>
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  setCredits: () => {},
  userId: null,
  setUserId: () => {},
})

export function CreditsProvider({ children, initialCredits = 0 }: { children: ReactNode; initialCredits?: number }) {
  const [credits, setCredits] = useState(initialCredits)
  const [userId, setUserId] = useState<string | null>(null)

  return (
    <CreditsContext.Provider value={{ credits, setCredits, userId, setUserId }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
