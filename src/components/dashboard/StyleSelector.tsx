"use client"

const VISUAL_STYLES = [
  { id: "white-bg", label: "Fondo Blanco (Studio)", icon: "📷" },
  { id: "lifestyle", label: "Lifestyle & Contexto", icon: "🌿" },
  { id: "ugc", label: "UGC Style", icon: "📱" },
  { id: "before-after", label: "Antes / Después", icon: "🔄" },
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
          className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            visualStyle === style.id
              ? "bg-[#D97757] text-white"
              : "bg-[#1E1C1A] text-[#9A9893] hover:bg-[#3A3833]"
          }`}
        >
          <span className="text-lg">{style.icon}</span>
          <span>{style.label}</span>
        </button>
      ))}
    </div>
  )
}