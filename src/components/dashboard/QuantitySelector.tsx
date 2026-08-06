"use client"

import styles from "./GeneratorWorkspace.module.css"

interface QuantitySelectorProps {
  cantidad: number
  setCantidad: (n: number) => void
  loading: boolean
}

export default function QuantitySelector({ cantidad, setCantidad, loading }: QuantitySelectorProps) {
  return (
    <div className={styles.quantitySelector}>
      <label>
        Cantidad de creativos
      </label>
      <div className={styles.quantityGrid}>
        {[1, 3, 5, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setCantidad(num)}
            disabled={loading}
            className={cantidad === num ? styles.selected : ""}
            aria-pressed={cantidad === num}
          >
            <b>{num}</b>
            <small>{num === 1 ? "creativo" : "creativos"}</small>
          </button>
        ))}
      </div>
      <div className={styles.quantityMeta}>
        <span>{cantidad} crédito{cantidad > 1 ? "s" : ""}</span>
        <b>·</b>
        <span>{cantidad === 1 ? "1 creativo" : `${cantidad} creativos`}</span>
      </div>
    </div>
  )
}
