"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

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
      {/* Burbuja flotante — glass oscuro con acento terracota y pulso sutil */}
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir Pixel IA"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 animate-pulse ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(30,28,26,0.85) 0%, rgba(26,26,26,0.78) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(217,119,87,0.25)",
          boxShadow: "0 4px 20px rgba(217,119,87,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
          animationDuration: "3s",
        }}
      >
        <Sparkles className="w-5 h-5 text-[#D97757]" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-[#F5F0E8]">Pixel IA</span>
      </button>

      {/* Ventana flotante */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[calc(100vh-48px)] flex flex-col rounded-[28px] overflow-hidden transition-all duration-300 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(30,28,26,0.92) 0%, rgba(26,26,26,0.88) 100%)",
          backdropFilter: "blur(28px) saturate(150%)",
          WebkitBackdropFilter: "blur(28px) saturate(150%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Reflejo superior */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[30%] rounded-[28px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
          }}
        />

        {/* Cabecera compacta */}
        <div
          className="flex-shrink-0 px-5 py-3.5 flex items-center justify-between relative z-10"
          style={{ borderBottom: "1px solid rgba(58,56,51,0.5)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                border: "1px solid rgba(217,119,87,0.2)",
              }}
            >
              <Sparkles className="w-4 h-4 text-[#D97757]" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-sm font-bold text-[#F5F0E8]">Pixel IA</span>
              <span className="text-[10px] text-[#9CA3AF] ml-2 hidden sm:inline">
                Estrategia creativa para tus anuncios.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/40 transition-colors"
              title="Minimizar"
            >
              <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/40 transition-colors"
              title="Cerrar"
            >
              <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Área de conversación (chat scroll) */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 relative z-10">
          {/* Mensaje inicial del asistente */}
          <div className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                border: "1px solid rgba(217,119,87,0.15)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D97757]" strokeWidth={1.5} />
            </div>
            <div
              className="rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[85%]"
              style={{
                background: "rgba(42,40,38,0.6)",
                border: "1px solid rgba(58,56,51,0.5)",
              }}
            >
              <p className="text-sm text-[#F5F0E8] leading-relaxed">
                Cuéntame qué vendes, a quién y cómo lo comercializas.
              </p>
            </div>
          </div>

          {/* Burbuja del usuario (si escribió) */}
          {input.trim() && (
            <div className="flex items-start gap-2 justify-end">
              <div
                className="rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[85%]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(217,119,87,0.25) 0%, rgba(217,119,87,0.12) 100%)",
                  border: "1px solid rgba(217,119,87,0.15)",
                }}
              >
                <p className="text-sm text-[#F5F0E8] leading-relaxed">{input}</p>
              </div>
            </div>
          )}

          {/* Recomendaciones como mensaje del asistente */}
          {demoStep === "results" && (
            <>
              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                    border: "1px solid rgba(217,119,87,0.15)",
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D97757]" strokeWidth={1.5} />
                </div>
                <div className="max-w-[90%] space-y-2.5">
                  <p className="text-xs text-[#9CA3AF] ml-1 mb-1">
                    Basado en tu descripción, recomiendo estos 3 ángulos:
                  </p>

                  {DEMO_RECOMMENDATIONS.map((rec) => (
                    <div
                      key={rec.angle}
                      className="rounded-xl p-3"
                      style={{
                        background: "rgba(42,40,38,0.5)",
                        border: "1px solid rgba(58,56,51,0.4)",
                      }}
                    >
                      <p className="text-sm font-bold text-[#F5F0E8] mb-1">{rec.title}</p>
                      <p className="text-xs text-[#9CA3AF] mb-2.5 leading-relaxed">
                        {rec.description}
                      </p>
                      <button
                        onClick={() => {}}
                        className="w-full py-2 rounded-lg text-xs font-semibold text-[#D97757] border border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                      >
                        Aplicar ángulo
                      </button>
                    </div>
                  ))}

                  {/* Formato + estilo recomendado */}
                  <div className="flex gap-2 pt-1">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#9CA3AF] bg-[#1E1C1A]/60 border border-[#3A3833]/50">
                      9:16 Vertical
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#9CA3AF] bg-[#1E1C1A]/60 border border-[#3A3833]/50">
                      Lifestyle
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#D97757] bg-[#D97757]/10 border border-[#D97757]/20">
                      Zona segura
                    </span>
                  </div>

                  <button
                    onClick={() => { setDemoStep("initial"); setInput(""); }}
                    className="text-xs font-medium text-[#9CA3AF] hover:text-[#F5F0E8] transition-colors flex items-center gap-1 ml-1"
                  >
                    <svg className="w-3 h-3" width={12} height={12} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Nueva consulta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Zona de entrada — fijada abajo */}
        <div
          className="flex-shrink-0 p-3 relative z-10"
          style={{ borderTop: "1px solid rgba(58,56,51,0.5)" }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder="Describe tu producto, público y forma de venta..."
              className="flex-1 resize-none bg-[#1E1C1A] border border-[#3A3833] px-3.5 py-2.5 rounded-xl text-sm text-[#F5F0E8] placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleRecommend()
                }
              }}
            />
            <button
              onClick={handleRecommend}
              className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.95] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              title="Enviar"
            >
              <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}