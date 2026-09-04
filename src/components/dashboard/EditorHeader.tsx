import Link from "next/link"
import { ArrowLeft, Image as ImageIcon, Video } from "lucide-react"
import styles from "./EditorHeader.module.css"

export default function EditorHeader({ tool }: { tool: "images" | "video" }) {
  const isVideo = tool === "video"
  const ToolIcon = isVideo ? Video : ImageIcon
  const title = isVideo ? "Video" : "Imágenes"

  return (
    <nav className={styles.editorHeader} aria-label={`Navegación del editor de ${title.toLowerCase()}`}>
      <Link href="/dashboard" className={styles.backButton}>
        <ArrowLeft aria-hidden="true" />
        <span>Inicio</span>
      </Link>
      <span className={styles.divider} aria-hidden="true" />
      <div className={styles.toolName} aria-current="page">
        <ToolIcon aria-hidden="true" />
        <span>{title}</span>
      </div>
    </nav>
  )
}
