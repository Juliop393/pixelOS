"use client"

import styles from "./GeneratorWorkspace.module.css"

const VISUAL_STYLES = [
  {
    id: "white-bg",
    label: "Fondo de estudio",
    icon: "📷",
    trait: "Limpio · comercial",
    swatch: "linear-gradient(145deg,#f2eee8,#9a928a)",
    tooltip: "Producto sobre fondo limpio. Ideal para e-commerce y catálogos.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle y contexto",
    icon: "🌿",
    trait: "Humano · natural",
    swatch: "linear-gradient(145deg,#ddc49f,#6d816d)",
    tooltip: "Producto en un ambiente real. Transmite aspiración y estilo de vida.",
  },
  {
    id: "product-action",
    label: "Producto en acción",
    icon: "🎬",
    trait: "Dinámico · demostrativo",
    swatch: "linear-gradient(145deg,#7e8a5f,#1b2119)",
    tooltip: "Mostrar el producto funcionando o siendo utilizado claramente.",
  },
  {
    id: "b2b",
    label: "Comercial B2B",
    icon: "🏢",
    trait: "Serio · confiable",
    swatch: "linear-gradient(145deg,#49697e,#122432)",
    tooltip: "Contexto profesional, industrial, empresarial, mayorista o corporativo.",
  },
  {
    id: "premium-editorial",
    label: "Premium editorial",
    icon: "✨",
    trait: "Elegante · aspiracional",
    swatch: "linear-gradient(145deg,#f0d8c9,#8e4f35)",
    tooltip: "Estética sofisticada, aspiracional, iluminación cuidada y composición elegante.",
  },
  {
    id: "benefits-infographic",
    label: "Infografía de beneficios",
    icon: "📊",
    trait: "Claro · informativo",
    swatch: "linear-gradient(145deg,#c6b990,#4e5949)",
    tooltip: "Producto acompañado de beneficios, características o datos visuales organizados.",
  },
  {
    id: "direct-offer",
    label: "Oferta y venta directa",
    icon: "🏷️",
    trait: "Impacto · conversión",
    swatch: "linear-gradient(145deg,#e67550,#6b2d20)",
    tooltip: "Diseño comercial con precio, promoción, stock, entrega, venta por mayor o CTA destacado.",
  },
  {
    id: "minimal-tech",
    label: "Minimalista tecnológico",
    icon: "💻",
    trait: "Moderno · preciso",
    swatch: "linear-gradient(145deg,#496b80,#142733)",
    tooltip: "Diseño moderno, limpio y preciso para SaaS, gadgets y productos digitales.",
  },
]

interface StyleSelectorProps {
  visualStyle: string
  setVisualStyle: (id: string) => void
}

export default function StyleSelector({ visualStyle, setVisualStyle }: StyleSelectorProps) {
  return (
    <div className={styles.styleGrid}>
      {VISUAL_STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => setVisualStyle(style.id)}
          className={visualStyle === style.id ? styles.styleSelected : ""}
          aria-pressed={visualStyle === style.id}
        >
          <i style={{ background: style.swatch }} aria-hidden="true"><em>{style.icon}</em></i>
          <span><b>{style.label}</b><small>{style.trait}</small></span>
          <strong>{visualStyle === style.id ? "✓" : ""}</strong>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
            className={styles.styleInfo}
            aria-label={`Info: ${style.label}`}
          >
            i
            <span role="tooltip">{style.tooltip}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
