"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface CreditsContextType {
  credits: number
  setCredits: React.Dispatch<React.SetStateAction<number>>
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 10,
  setCredits: () => {},
})

export function CreditsProvider({ children, initialCredits = 10 }: { children: ReactNode; initialCredits?: number }) {
  const [credits, setCredits] = useState(initialCredits)

  return (
    <CreditsContext.Provider value={{ credits, setCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  return useContext(CreditsContext)
}
