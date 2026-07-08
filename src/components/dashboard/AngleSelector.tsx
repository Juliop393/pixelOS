"use client"

import { ANGLES } from "@/lib/angles-data"

interface AngleSelectorProps {
  selectedAngle: string | null
  onSelectAngle: (id: string) => void
  loading: boolean
}

export default function AngleSelector({ selectedAngle, onSelectAngle, loading }: AngleSelectorProps) {
  return (
    <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
      <h3 className="text-sm font-bold text-[#E8E6E1] mb-1 uppercase tracking-wider">
        Ángulos de Venta
      </h3>
      <p className="text-xs text-[#9A9893] mb-5">
        Selecciona el enfoque persuasivo de tu anuncio
      </p>

      <div className="space-y-3.5">
        {ANGLES.map((angle) => {
          const isSelected = selectedAngle === angle.id
          return (
            <button
              key={angle.id}
              type="button"
              onClick={() => onSelectAngle(angle.id)}
              disabled={loading}
              className={`group relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? "border-[#D97757] bg-[#D97757]/10 shadow-lg shadow-[#D97757]/10"
                  : "border-[#3A3833] hover:border-[#D97757]/50 hover:bg-[#1E1C1A] hover:-translate-y-0.5"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
            >
              {isSelected && (
                <span className="absolute top-4 right-4 flex items-center justify-center w-6 h-6 rounded-full bg-[#D97757] text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}

              <div className="flex items-start gap-4 mb-3">
                <span
                  className={`flex items-center justify-center w-12 h-12 rounded-xl text-2xl flex-shrink-0 transition-colors ${
                    isSelected ? "bg-[#D97757]/20" : "bg-[#1E1C1A] group-hover:bg-[#D97757]/10"
                  }`}
                >
                  {angle.icon}
                </span>
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="text-base font-bold text-[#E8E6E1] mb-1">
                    {angle.title}
                  </h4>
                  <p className="text-[13px] text-[#9A9893] leading-relaxed">
                    {angle.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pl-16">
                {angle.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.color}`}
                  >
                    <span className="opacity-60">{badge.label}:</span>
                    <span>{badge.value}</span>
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