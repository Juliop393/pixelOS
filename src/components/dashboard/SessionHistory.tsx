"use client"

interface SessionHistoryProps {
  sessionHistory: Array<{ imageUrl: string; angle: string }>
  onSelect: (item: { imageUrl: string; angle: string }) => void
}

export default function SessionHistory({ sessionHistory, onSelect }: SessionHistoryProps) {
  if (sessionHistory.length === 0) return null

  return (
    <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-4 flex-shrink-0">
      <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-3">
        Historial de sesión
      </p>
      <div className="grid grid-cols-4 gap-2">
        {sessionHistory.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item)}
            className="aspect-square rounded-lg overflow-hidden border border-[#3A3833] hover:border-[#D97757]/50 transition-all duration-200"
          >
            <img
              src={item.imageUrl}
              alt={`Creativo ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}