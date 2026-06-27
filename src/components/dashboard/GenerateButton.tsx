"use client"

interface GenerateButtonProps {
  onClick: () => void
  disabled: boolean
  loading: boolean
  credits: number
  cantidad: number
  progress: { completed: number; total: number }
}

export default function GenerateButton({
  onClick,
  disabled,
  loading,
  credits,
  cantidad,
  progress,
}: GenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D97757] disabled:active:scale-100 mb-3 mt-4"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Generando {progress.total > 0 ? `(${progress.completed}/${progress.total})` : ""}...
        </>
      ) : credits === 0 ? (
        "Sin créditos — Elige un plan"
      ) : credits < cantidad ? (
        `Necesitas ${cantidad} crédito${cantidad > 1 ? "s" : ""}`
      ) : (
        <>
          <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generar {cantidad > 1 ? `${cantidad} Creativos` : "Creativo"}
        </>
      )}
    </button>
  )
}