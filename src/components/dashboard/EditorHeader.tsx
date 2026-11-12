import type { ReactNode } from "react"
import styles from "./EditorHeader.module.css"

/* The back link and tool name now live in the sticky top row; this bar keeps the editor's mode switch. */
export default function EditorHeader({ tool, action }: { tool: "images" | "video"; action?: ReactNode }) {
  const title = tool === "video" ? "video" : "imágenes"
  if (!action) return null
  return (
    <div className={styles.editorHeader} aria-label={`Opciones del editor de ${title}`} role="group">
      <div className={styles.actionSlot}>{action}</div>
    </div>
  )
}
