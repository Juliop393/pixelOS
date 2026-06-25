"use client"

import QuantitySelector from "./QuantitySelector"
import GenerateButton from "./GenerateButton"

interface ProductFormProps {
  producto: string
  setProducto: (v: string) => void
  textoAnuncio: string
  setTextoAnuncio: (v: string) => void
  ctaContacto: string
  setCtaContacto: (v: string) => void
  cantidad: number
  setCantidad: (n: number) => void
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
  credits: number
  progress: { completed: number; total: number }
}

export default function ProductForm({
  producto,
  setProducto,
  textoAnuncio,
  setTextoAnuncio,
  ctaContacto,
  setCtaContacto,
  cantidad,
  setCantidad,
  loading,
  onGenerate,
  canGenerate,
  credits,
  progress,
}: ProductFormProps) {
  return (
    <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
      <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
        Tu Producto
      </h3>
      <input
        type="text"
        value={producto}
        onChange={(e) => setProducto(e.target.value)}
        placeholder="Describe tu producto (Ej: Crema hidratante para piel seca, marca propia, precio S/89)"
        className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors mb-3"
      />

      <div className="space-y-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
            Texto del anuncio (opcional)
          </label>
          <input
            type="text"
            value={textoAnuncio}
            onChange={(e) => setTextoAnuncio(e.target.value)}
            placeholder="Ej: ¡50% descuento solo hoy! Envío gratis"
            className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2.5 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
            CTA o contacto (opcional)
          </label>
          <input
            type="text"
            value={ctaContacto}
            onChange={(e) => setCtaContacto(e.target.value)}
            placeholder="Ej: WhatsApp 999-888-777 | Compra en @tumarca"
            className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2.5 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
          />
        </div>
      </div>

      <QuantitySelector cantidad={cantidad} setCantidad={setCantidad} loading={loading} />

      <GenerateButton
        onClick={onGenerate}
        disabled={!canGenerate}
        loading={loading}
        credits={credits}
        cantidad={cantidad}
        progress={progress}
      />

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-[#9A9893] border border-[#3A3833] hover:border-[#D97757]/30 hover:text-[#E8E6E1] transition-all duration-200"
      >
        <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        Subir imagen de referencia (Opcional)
      </button>
    </div>
  )
}