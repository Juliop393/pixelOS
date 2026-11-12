"use client"

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"

/*
 * The PixelIA orb lives in the shared topbar, but the assistant panel belongs to the page:
 * Video, Imágenes and Inicio feed it their own context. A page that hosts PixelIA registers
 * its open state here; on any other page the topbar opens a general PixelIA panel itself.
 */
type Host = { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }

const PixelAiContext = createContext<{ host: Host | null; setHost: (host: Host | null) => void }>({
  host: null,
  setHost: () => {},
})

export function PixelAiProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<Host | null>(null)
  return <PixelAiContext.Provider value={{ host, setHost }}>{children}</PixelAiContext.Provider>
}

export const usePixelAi = () => useContext(PixelAiContext)

/** Hands the page's PixelIA panel to the topbar orb while the page is mounted. */
export function usePixelAiHost(open: boolean, setOpen: Dispatch<SetStateAction<boolean>>) {
  const { setHost } = useContext(PixelAiContext)
  useEffect(() => { setHost({ open, setOpen }) }, [open, setOpen, setHost])
  useEffect(() => () => setHost(null), [setHost])
}
