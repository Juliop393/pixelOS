"use client"

import { useState } from "react"

type DemoStep = "initial" | "results"

const DEMO_RECOMMENDATIONS = [
  {
    title: "Problema y solución",
    description: "Ideal para mostrar el problema principal y cómo tu producto lo resuelve.",
    angle: "problem-solution",
  },
  {
    title: "Demostración del producto",
    description: "Útil para enseñar el producto funcionando en su contexto real.",
    angle: "product-demo",
  },
  {
    title: "Oferta y conveniencia",
    description: "Recomendado para destacar stock, precio, entrega o venta por mayor.",
    angle: "offer-convenience",
  },
]

export default function PixelAdvisor() {
  const [isOpen, setIsOpen] = useState(false)
  const [demoStep, setDemoStep] = useState<DemoStep>("initial")
  const [input, setInput] = useState("")

  const handleRecommend = () => {
    if (!input.trim()) return
    setDemoStep("results")
  }

  const handleClose = () => {
    setIsOpen(false)
    setDemoStep("initial")
    setInput("")
  }

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir Pixel Advisor"
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(217,119,87,0.9) 0%, rgba(217,119,87,0.75) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(217,119,87,0.3)",
          boxShadow: "0 8px 24px rgba(217,119,87,0.2)",
        }}
      >
        <svg
          className="w-6 h-6 text-white"
          width={24}
          height={24}
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </button>

      {/* Overlay de fondo */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Panel lateral */}
      <div
        className={`fixed top-3 right-3 z-50 h-[calc(100vh-24px)] w-[400px] flex flex-col rounded-[28px] overflow-hidden transition-all duration-300 ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(30,28,26,0.88) 0%, rgba(26,26,26,0.82) 100%)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.35)",
        }}
      >
        {/* Reflejo superior */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[35%] rounded-[28px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
          }}
        />

        {/* Cabecera */}
        <div className="flex-shrink-0 p-5 border-b border-[#3A3833]/60 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                  border: "1px solid rgba(217,119,87,0.2)",
                }}
              >
                <svg
                  className="w-5 h-5 text-[#D97757]"
                  width={20}
                  height={20}
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#F5F0E8]">Pixel Advisor</h2>
                <p className="text-xs text-[#9CA3AF]">
                  Te ayudo a elegir el mejor enfoque para tu anuncio.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/40 transition-colors"
            >
              <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido (scroll interno) */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 relative z-10">
          {demoStep === "initial" && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(217,119,87,0.06)",
                  border: "1px solid rgba(217,119,87,0.1)",
                }}
              >
                <p className="text-sm text-[#F5F0E8] leading-relaxed">
                  Describe brevemente tu producto, público y forma de venta.
                </p>
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                placeholder="Ej: Vendo cremas hidratantes para piel seca a mujeres de 25-45 años por Instagram y WhatsApp..."
                className="w-full resize-none bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#F5F0E8] placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
              />

              <button
                onClick={handleRecommend}
                className="w-full py-3 px-4 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              >
                Recomendar 3 ángulos
              </button>
            </div>
          )}

          {demoStep === "results" && (
            <div className="space-y-4">
              <button
                onClick={() => setDemoStep("initial")}
                className="text-xs font-medium text-[#9CA3AF] hover:text-[#F5F0E8] transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Nueva consulta
              </button>

              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Recomendaciones
              </p>

              {DEMO_RECOMMENDATIONS.map((rec) => (
                <div
                  key={rec.angle}
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(42,40,38,0.5)",
                    border: "1px solid rgba(58,56,51,0.5)",
                  }}
                >
                  <h3 className="text-sm font-bold text-[#F5F0E8] mb-1.5">{rec.title}</h3>
                  <p className="text-xs text-[#9CA3AF] mb-3 leading-relaxed">{rec.description}</p>
                  <button
                    onClick={() => {}}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-[#D97757] border border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                  >
                    Aplicar ángulo
                  </button>
                </div>
              ))}

              {/* Sugerencias de formato y estilo */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(42,40,38,0.5)",
                  border: "1px solid rgba(58,56,51,0.5)",
                }}
              >
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
                  También recomendado
                </p>
                <div className="space-y-2 text-sm text-[#F5F0E8]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Formato</span>
                    <span className="font-medium">9:16 Vertical</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Estilo visual</span>
                    <span className="font-medium">Lifestyle y contexto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF]">Zona segura Meta</span>
                    <span className="font-medium text-[#D97757]">Sí</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}