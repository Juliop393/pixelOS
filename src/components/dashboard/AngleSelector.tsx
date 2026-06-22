"use client"

import { ANGLES } from "@/lib/angles-data"

interface AngleSelectorProps {
  selectedAngle: string | null
  onSelectAngle: (id: string) => void
  loading: boolean
}

export default function AngleSelector({ selectedAngle, onSelectAngle, loading }: AngleSelectorProps) {
  return (
    <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5 h-full">
      <h3 className="text-sm font-bold text-[#E8E6E1] mb-1 uppercase tracking-wider">
        Ángulos de Venta
      </h3>
      <p className="text-xs text-[#9A9893] mb-5">
        Selecciona el enfoque persuasivo
      </p>

      <div className="space-y-3">
        {ANGLES.map((angle) => (
          <button
            key={angle.id}
            type="button"
            onClick={() => onSelectAngle(angle.id)}
            disabled={loading}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
              selectedAngle === angle.id
                ? "border-[#D97757] bg-[#D97757]/10"
                : "border-[#3A3833] hover:border-[#D97757]/40 hover:bg-[#1E1C1A]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{angle.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#E8E6E1] mb-1">
                  {angle.title}
                </h4>
                <p className="text-xs text-[#9A9893] leading-relaxed">
                  {angle.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
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
        ))}
      </div>
    </div>
  )
}