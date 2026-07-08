"use client"

import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const hasNoCredits = credits === 0

  const handleClick = () => {
    if (hasNoCredits) {
      router.push("/pricing")
      return
    }

    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!hasNoCredits && disabled}
      className="group w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-base font-bold bg-[#D97757] text-white hover:bg-[#C26547] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#D97757]/30 hover:shadow-xl hover:shadow-[#D97757]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#D97757] disabled:hover:translate-y-0 disabled:hover:shadow-lg disabled:active:scale-100"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" viewBox="0 0 24 24">
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
          <svg className="w-5 h-5 transition-transform group-hover:scale-110" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generar {cantidad > 1 ? `${cantidad} Creativos` : "Creativo"}
        </>
      )}
    </button>
  )
}
