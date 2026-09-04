import Link from "next/link"
import { ArrowUpRight, FolderOpen, Image as ImageIcon, Sparkles, Video } from "lucide-react"
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
  return (
    <div className={styles.homePage}>
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
          <div className={styles.pixelAiPrompt} aria-label="Vista previa de Pixel IA">
            <span>Cuéntame qué tienes en mente…</span>
            <i aria-hidden="true"><Sparkles /></i>
          </div>
        </section>
      </main>
    </div>
  )
}
