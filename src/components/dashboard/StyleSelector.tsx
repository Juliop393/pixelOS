"use client"

const VISUAL_STYLES = [
  {
    id: "white-bg",
    label: "Fondo de estudio",
    icon: "📷",
    tooltip: "Producto sobre fondo limpio. Ideal para e-commerce y catálogos.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle y contexto",
    icon: "🌿",
    tooltip: "Producto en un ambiente real. Transmite aspiración y estilo de vida.",
  },
  {
    id: "product-action",
    label: "Producto en acción",
    icon: "🎬",
    tooltip: "Mostrar el producto funcionando o siendo utilizado claramente.",
  },
  {
    id: "b2b",
    label: "Comercial B2B",
    icon: "🏢",
    tooltip: "Contexto profesional, industrial, empresarial, mayorista o corporativo.",
  },
  {
    id: "premium-editorial",
    label: "Premium editorial",
    icon: "✨",
    tooltip: "Estética sofisticada, aspiracional, iluminación cuidada y composición elegante.",
  },
  {
    id: "benefits-infographic",
    label: "Infografía de beneficios",
    icon: "📊",
    tooltip: "Producto acompañado de beneficios, características o datos visuales organizados.",
  },
  {
    id: "direct-offer",
    label: "Oferta y venta directa",
    icon: "🏷️",
    tooltip: "Diseño comercial con precio, promoción, stock, entrega, venta por mayor o CTA destacado.",
  },
  {
    id: "minimal-tech",
    label: "Minimalista tecnológico",
    icon: "💻",
    tooltip: "Diseño moderno, limpio y preciso para SaaS, gadgets y productos digitales.",
  },
]

interface StyleSelectorProps {
  visualStyle: string
  setVisualStyle: (id: string) => void
}

export default function StyleSelector({ visualStyle, setVisualStyle }: StyleSelectorProps) {
  return (
    <div className="space-y-2">
      {VISUAL_STYLES.map((style) => (
        <button
          key={style.id}
          onClick={() => setVisualStyle(style.id)}
          className={`relative w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            visualStyle === style.id
              ? "bg-[#D97757] text-white"
              : "bg-[#1E1C1A] text-[#9A9893] hover:bg-[#3A3833]"
          }`}
        >
          <span className="text-lg">{style.icon}</span>
          <span className="flex-1 text-left">{style.label}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
            className="group relative inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-[#9A9893] border border-[#3A3833] hover:text-[#E8E6E1] hover:border-[#D97757]/50 transition-colors cursor-help"
            aria-label={`Info: ${style.label}`}
          >
            ⓘ
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full mt-2 z-50 w-56 px-3 py-2 rounded-lg bg-[#1E1C1A] border border-[#3A3833] text-xs font-normal text-[#E8E6E1] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
            >
              {style.tooltip}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}