"use client"

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
    <div className="space-y-2">
      {ASPECT_RATIOS.map((ratio) => (
        <button
          key={ratio.id}
          onClick={() => setAspectRatio(ratio.id)}
          className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            aspectRatio === ratio.id
              ? "bg-[#D97757] text-white"
              : "bg-[#1E1C1A] text-[#9A9893] hover:bg-[#3A3833]"
          }`}
        >
          <span className="font-bold">{ratio.label}</span>
          <span className="text-xs opacity-60">{ratio.description}</span>
        </button>
      ))}
    </div>
  )
}