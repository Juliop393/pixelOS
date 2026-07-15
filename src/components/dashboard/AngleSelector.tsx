"use client"

import { ANGLES } from "@/lib/angles-data"

interface AngleSelectorProps {
  selectedAngle: string | null
  onSelectAngle: (id: string) => void
  loading: boolean
}

export default function AngleSelector({ selectedAngle, onSelectAngle, loading }: AngleSelectorProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#F5F0E8] uppercase tracking-wider">
            Ángulos de Venta
          </h3>
          <p className="text-xs text-[#9A9893] mt-0.5">
            Elige el enfoque persuasivo de tu anuncio
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {ANGLES.map((angle) => {
          const isSelected = selectedAngle === angle.id
          return (
            <button
              key={angle.id}
              type="button"
              onClick={() => onSelectAngle(angle.id)}
              disabled={loading}
              className={`group relative w-full min-h-36 text-left p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col ${
                isSelected
                  ? "border-[#D97757] bg-[#D97757]/10 shadow-lg shadow-[#D97757]/20"
                  : "border-[#3A3833] bg-[#2A2826]/40 hover:border-[#D97757]/50 hover:bg-[#1E1C1A]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-[#D97757] text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}

              <span
                className={`flex items-center justify-center w-12 h-12 rounded-xl text-2xl flex-shrink-0 mb-3 transition-colors ${
                  isSelected ? "bg-[#D97757]/20" : "bg-[#1E1C1A] group-hover:bg-[#D97757]/10"
                }`}
              >
                {angle.icon}
              </span>

              <h4 className="text-sm font-bold text-[#F5F0E8] mb-1 pr-6">
                {angle.title}
              </h4>
              <p className="text-[11px] text-[#9A9893] leading-relaxed flex-1">
                {angle.description}
              </p>

              <div className="flex flex-wrap gap-1 mt-auto pt-2">
                {angle.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${badge.color}`}
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