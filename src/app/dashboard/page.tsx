"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { ArrowUpRight, FolderOpen, Image as ImageIcon, Sparkles, Video } from "lucide-react"
import PixelAiDrawer from "@/components/dashboard/PixelAiDrawer"
import type { PixelAiInitialRequest } from "@/components/dashboard/PixelAdvisor"
import styles from "@/components/dashboard/DashboardHome.module.css"

const primaryActions = [
  {
    title: "Crear imagen",
    description: "Convierte un producto en creativos listos para Feed, Stories y Reels.",
    href: "/dashboard/imagenes",
    icon: ImageIcon,
    detail: "Generador de imágenes",
  },
  {
    title: "Crear video",
    description: "Construye una secuencia visual pensada para detener el scroll.",
    href: "/dashboard/videos",
    icon: Video,
    detail: "Editor de video",
  },
  {
    title: "Mis creativos",
    description: "Vuelve a tus resultados y mantén organizada tu biblioteca creativa.",
    href: "/dashboard/assets",
    icon: FolderOpen,
    detail: "Biblioteca",
  },
]

export default function DashboardHomePage() {
  const requestId = useRef(0)
  const [pixelAiOpen, setPixelAiOpen] = useState(false)
  const [pixelAiInput, setPixelAiInput] = useState("")
  const [initialRequest, setInitialRequest] = useState<PixelAiInitialRequest | null>(null)

  const openPixelAi = () => {
    const message = pixelAiInput.trim()
    setPixelAiOpen(true)

    if (message) {
      requestId.current += 1
      setInitialRequest({ id: requestId.current, message })
      setPixelAiInput("")
    }
  }

  return (
    <div id="dashboard-home" className={styles.homePage}>
      <main className={styles.homeContent}>
        <header className={styles.intro}>
          <span>ESPACIO CREATIVO</span>
          <h1>¿Qué quieres crear hoy?</h1>
          <p>Elige una herramienta y convierte tu siguiente idea en una pieza lista para publicar.</p>
        </header>

        <section className={styles.actionGrid} aria-label="Acciones principales">
          {primaryActions.map(({ title, description, href, icon: Icon, detail }) => (
            <Link key={href} href={href} className={styles.actionCard}>
              <span className={styles.actionIcon} aria-hidden="true"><Icon /></span>
              <span className={styles.actionMeta}>{detail}</span>
              <h2>{title}</h2>
              <p>{description}</p>
              <span className={styles.actionLink}>Empezar <ArrowUpRight aria-hidden="true" /></span>
            </Link>
          ))}
        </section>

        <section className={styles.pixelAiCard} aria-labelledby="pixel-ai-home-title">
          <div className={styles.pixelAiMark} aria-hidden="true"><Sparkles /></div>
          <div className={styles.pixelAiCopy}>
            <span>PIXEL IA</span>
            <h2 id="pixel-ai-home-title">¿Qué quieres crear?</h2>
            <p>Describe tu producto o tu idea. Pixel IA te ayudará a encontrar un punto de partida creativo.</p>
          </div>
          <form className={styles.pixelAiPrompt} onSubmit={(event) => { event.preventDefault(); openPixelAi() }}>
            <input
              value={pixelAiInput}
              onChange={(event) => setPixelAiInput(event.target.value)}
              aria-label="Mensaje para Pixel IA"
              placeholder="Cuéntame qué tienes en mente…"
            />
            <button type="submit" aria-label="Abrir Pixel IA" title="Abrir Pixel IA"><Sparkles /></button>
          </form>
        </section>
      </main>
      <PixelAiDrawer
        open={pixelAiOpen}
        onOpenChange={setPixelAiOpen}
        initialRequest={initialRequest}
      />
    </div>
  )
}
