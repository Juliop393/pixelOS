"use client"

import { useEffect, useState } from "react"

interface Creativo {
  id: number
  imageUrl: string
  producto: string
  angulo: string
  formato: string
  fecha: string
}

const ANGLE_NAMES: Record<string, string> = {
  "problem-solution": "Problema y Solución",
  "social-proof": "Prueba Social",
  "product-demo": "Demostración",
  "direct-offer": "Oferta Directa",
  "comparison": "Comparación",
  "scarcity": "Escasez",
}

const FORMAT_NAMES: Record<string, string> = {
  "square": "1:1",
  "story": "9:16",
  "4:5": "4:5",
}

export default function MisCreativosPage() {
  const [creativos, setCreativos] = useState<Creativo[]>([])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("afm_creativos") || "[]")
    setCreativos(saved)
  }, [])

  const handleDownload = (imageUrl: string, id: number) => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `creativo-${id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString("es-PE", { 
      day: "numeric", 
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mis Creativos</h1>
        <p className="text-[#9A9893]">Tus creativos generados con IA</p>
      </div>

      {creativos.length === 0 ? (
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-[#9A9893]/40" width={32} height={32} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[#9A9893] font-medium mb-1">Aún no has generado creativos.</p>
          <p className="text-[#9A9893]/50 text-sm">¡Empieza ahora!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creativos.map((creativo) => (
            <div key={creativo.id} className="bg-[#2A2826] rounded-2xl border border-[#3A3833] overflow-hidden group">
              <div className="aspect-square bg-[#1E1C1A] relative overflow-hidden">
                <img
                  src={creativo.imageUrl}
                  alt={`Creativo para ${creativo.producto}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDownload(creativo.imageUrl, creativo.id)}
                    className="px-4 py-2 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-sm font-semibold text-[#E8E6E1] truncate">{creativo.producto}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30">
                    {ANGLE_NAMES[creativo.angulo] || creativo.angulo}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#3A3833] text-[#9A9893]">
                    {FORMAT_NAMES[creativo.formato] || creativo.formato}
                  </span>
                </div>
                <p className="text-xs text-[#9A9893]/60">{formatDate(creativo.fecha)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
