"use client"

import styles from "./GeneratorWorkspace.module.css"

const ASPECT_RATIOS = [
  { id: "square", label: "1:1", description: "Cuadrado" },
  { id: "story", label: "9:16", description: "Vertical" },
  { id: "4:5", label: "4:5", description: "Feed Mobile" },
]

interface FormatSelectorProps {
  aspectRatio: string
  setAspectRatio: (id: string) => void
}

export default function FormatSelector({ aspectRatio, setAspectRatio }: FormatSelectorProps) {
  return (
    <div className={styles.formatChoices}>
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio.id}
          type="button"
          onClick={() => setAspectRatio(ratio.id)}
          className={aspectRatio === ratio.id ? styles.selected : ""}
          aria-pressed={aspectRatio === ratio.id}
        >
          <i data-ratio={ratio.label} aria-hidden="true" />
          <b>{ratio.label}</b>
          <small>{ratio.description}</small>
        </button>
      ))}
    </div>
  )
}
