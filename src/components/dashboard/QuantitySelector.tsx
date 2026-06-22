"use client"

interface QuantitySelectorProps {
  cantidad: number
  setCantidad: (n: number) => void
  loading: boolean
}

export default function QuantitySelector({ cantidad, setCantidad, loading }: QuantitySelectorProps) {
  return (
    <div className="mt-4">
      <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
        Cantidad de creativos
      </label>
      <div className="grid grid-cols-4 gap-2">
        {[1, 3, 5, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => setCantidad(num)}
            disabled={loading}
            className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              cantidad === num
                ? "bg-[#D97757] text-white"
                : "bg-[#1E1C1A] text-[#9A9893] hover:bg-[#3A3833]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {num}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#9A9893] mt-2">
        {cantidad} crédito{cantidad > 1 ? "s" : ""} • {cantidad === 1 ? "1 creativo" : `${cantidad} creativos`}
      </p>
    </div>
  )
}