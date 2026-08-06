"use client"

import { CSSProperties } from "react"
import { ANGLES } from "@/lib/angles-data"
import styles from "./GeneratorWorkspace.module.css"

const ANGLE_ACCENTS: Record<string, string> = {
  comparison: "#8d79d6",
  "problem-solution": "#d9a62e",
  "primary-benefit": "#df7652",
  "social-proof": "#d86d90",
  "product-demo": "#5e98c7",
  "usage-experience": "#55a7a4",
  "offer-convenience": "#d47b45",
  "unique-mechanism": "#c08a62",
}

interface AngleSelectorProps {
  selectedAngle: string | null
  onSelectAngle: (id: string) => void
  loading: boolean
  layout?: "list" | "grid"
}

export default function AngleSelector({ selectedAngle, onSelectAngle, loading, layout = "list" }: AngleSelectorProps) {
  return (
    <div className={styles.angleSelector} data-layout={layout}>
      <div className={styles.selectorIntro}>
        <h3>Ángulos de Venta</h3>
        <p>Elige el enfoque persuasivo de tu anuncio</p>
      </div>

      <div className={styles.angleGrid}>
        {ANGLES.map((angle) => {
          const isSelected = selectedAngle === angle.id
          return (
            <button
              key={angle.id}
              type="button"
              onClick={() => onSelectAngle(angle.id)}
              disabled={loading}
              aria-pressed={isSelected}
              className={isSelected ? styles.angleSelected : ""}
              style={{ "--angle-accent": ANGLE_ACCENTS[angle.id] ?? "#d76b45" } as CSSProperties}
            >
              <div className={styles.angleTop}>
                <span className={styles.angleIcon}>{angle.icon}</span>
                <i>{isSelected ? "✓" : ""}</i>
              </div>
              <b>{angle.title}</b>
              <p>{angle.description}</p>
              <div className={styles.angleBadges}>
                {angle.badges.map((badge, idx) => (
                  <span key={idx}>
                    <small>{badge.label}:</small> {badge.value}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
