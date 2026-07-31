"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"

type Recommendation = {
  angleId: string
  angleName: string
  reason: string
  styleId: string
  styleName: string
  format: string
  safeZoneMeta: boolean
  productDescription?: string
}

type ConvState = "collecting" | "confirming" | "recommending" | "completed"

type Message = {
  role: "user" | "assistant"
  content: string
}

interface PixelAdvisorProps {
  onApplyRecommendation?: (rec: Recommendation) => void
  accessToken?: string
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Cuéntame qué vendes, a quién se lo vendes y qué quieres conseguir con el anuncio.",
}

export default function PixelAdvisor({ onApplyRecommendation, accessToken }: PixelAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [convState, setConvState] = useState<ConvState>("collecting")
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collectedContext, setCollectedContext] = useState<Record<string, unknown>>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [summary, setSummary] = useState("")
  const [confirmationMessage, setConfirmationMessage] = useState("")
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null)
  const [appliedDetails, setAppliedDetails] = useState<Recommendation | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading, recommendations])

  const formatLabels: Record<string, string> = {
    square: "1:1 Cuadrado",
    story: "9:16 Vertical",
    "4:5": "4:5 Feed Mobile",
  }

  const handleClose = () => {
    setIsOpen(false)
    setError(null)
  }

  const handleReset = () => {
    setConvState("collecting")
    setMessages([INITIAL_MESSAGE])
    setInput("")
    setCollectedContext({})
    setRecommendations([])
    setSummary("")
    setConfirmationMessage("")
    setError(null)
    setAppliedIndex(null)
    setAppliedDetails(null)
  }

  const sendChatMessage = async (userMessage: string, context?: Record<string, unknown>) => {
    if (!accessToken) {
      setError("Sesión expirada. Vuelve a iniciar sesión.")
      return
    }

    setIsLoading(true)
    setError(null)

    const chatMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ]

    try {
      const res = await fetch("/api/pixel-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "chat",
          messages: chatMessages,
          collectedContext: context ?? collectedContext,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = "No pudimos consultar Pixel IA en este momento. Inténtalo nuevamente."
        setError(msg)
        return
      }

      const assistantContent = data.message || "¿En qué más puedo ayudarte?"
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantContent },
      ])

      if (data.collectedContext && typeof data.collectedContext === "object") {
        setCollectedContext(data.collectedContext)
      }

      if (data.type === "confirmation") {
        setConfirmationMessage(assistantContent)
        setConvState("confirming")
      }
    } catch {
      setError("Error al conectar con Pixel IA")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecommend = async () => {
    const userMessage = input.trim()
    if (!userMessage || isLoading) return

    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setInput("")

    await sendChatMessage(userMessage)
  }

  const handleConfirm = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)
    setConvState("recommending")

    try {
      const res = await fetch("/api/pixel-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "recommend",
          collectedContext,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al generar recomendaciones")
        setConvState("confirming")
        return
      }

      setSummary(data.summary || "")
      const recs = (data.recommendations || []) as Recommendation[]
      if (data.productDescription) {
        for (const rec of recs) { rec.productDescription = data.productDescription as string }
      }
      setRecommendations(recs)
      setConvState("completed")
    } catch {
      setError("Error al conectar con Pixel IA")
      setConvState("confirming")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCorrect = () => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Claro, dime qué necesitas corregir o añadir." },
    ])
    setConvState("collecting")
    setConfirmationMessage("")
  }

  const handleApply = (rec: Recommendation, idx: number) => {
    onApplyRecommendation?.(rec)
    setAppliedIndex(idx)
    setAppliedDetails(rec)
  }

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir Pixel IA"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 animate-pulse ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background: "linear-gradient(135deg, rgba(30,28,26,0.85) 0%, rgba(26,26,26,0.78) 100%)",
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
          background: "linear-gradient(135deg, rgba(30,28,26,0.92) 0%, rgba(26,26,26,0.88) 100%)",
          backdropFilter: "blur(28px) saturate(150%)",
          WebkitBackdropFilter: "blur(28px) saturate(150%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Reflejo superior */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[30%] rounded-[28px] pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)" }}
        />

        {/* Cabecera */}
        <div
          className="flex-shrink-0 px-5 py-3.5 flex items-center justify-between relative z-10"
          style={{ borderBottom: "1px solid rgba(58,56,51,0.5)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
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
            <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/40 transition-colors" title="Minimizar">
              <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button onClick={handleClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/40 transition-colors" title="Cerrar">
              <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Área de conversación */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 relative z-10">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user"
            return (
              <div key={idx} className={`flex items-start gap-2 ${isUser ? "justify-end" : ""}`}>
                {!isUser && (
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                      border: "1px solid rgba(217,119,87,0.15)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D97757]" strokeWidth={1.5} />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] ${
                    isUser ? "rounded-tr-md" : "rounded-tl-md"
                  }`}
                  style={
                    isUser
                      ? {
                          background: "linear-gradient(135deg, rgba(217,119,87,0.25) 0%, rgba(217,119,87,0.12) 100%)",
                          border: "1px solid rgba(217,119,87,0.15)",
                        }
                      : {
                          background: "rgba(42,40,38,0.6)",
                          border: "1px solid rgba(58,56,51,0.5)",
                        }
                  }
                >
                  <p className="text-sm text-[#F5F0E8] leading-relaxed">{msg.content}</p>

                  {/* Botones de confirmación en el último mensaje del asistente */}
                  {convState === "confirming" && !isUser && idx === messages.length - 1 && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                      >
                        {isLoading ? "..." : "Sí, recomendar ángulos"}
                      </button>
                      <button
                        onClick={handleCorrect}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-[#9CA3AF] border border-[#3A3833] hover:border-[#D97757]/50 hover:text-[#F5F0E8] transition-colors disabled:opacity-50"
                      >
                        Corregir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Loading */}
          {isLoading && convState !== "confirming" && (
            <div className="flex items-start gap-2">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                  border: "1px solid rgba(217,119,87,0.15)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D97757]" strokeWidth={1.5} />
              </div>
              <div
                className="rounded-2xl rounded-tl-md px-4 py-3"
                style={{ background: "rgba(42,40,38,0.6)", border: "1px solid rgba(58,56,51,0.5)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#D97757] animate-pulse" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[#D97757] animate-pulse" style={{ animationDelay: "200ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[#D97757] animate-pulse" style={{ animationDelay: "400ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                  border: "1px solid rgba(217,119,87,0.15)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D97757]" strokeWidth={1.5} />
              </div>
              <div className="max-w-[85%] space-y-2">
                <div className="rounded-2xl rounded-tl-md px-3.5 py-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-sm text-[#F5F0E8]">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {recommendations.length > 0 && (
            <div className="flex items-start gap-2">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(217,119,87,0.2) 0%, rgba(217,119,87,0.08) 100%)",
                  border: "1px solid rgba(217,119,87,0.15)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D97757]" strokeWidth={1.5} />
              </div>
              <div className="max-w-[90%] space-y-2.5">
                {summary && <p className="text-xs text-[#9CA3AF] ml-1">{summary}</p>}

                {recommendations.map((rec, idx) => (
                  <div key={idx} className="rounded-xl p-3" style={{ background: "rgba(42,40,38,0.5)", border: "1px solid rgba(58,56,51,0.4)" }}>
                    <p className="text-sm font-bold text-[#F5F0E8] mb-1">{rec.angleName}</p>
                    <p className="text-xs text-[#9CA3AF] mb-2 leading-relaxed">{rec.reason}</p>
                    <div className="flex gap-1.5 mb-2.5 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#9CA3AF] bg-[#1E1C1A]/60 border border-[#3A3833]/50">
                        {formatLabels[rec.format] ?? rec.format}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#9CA3AF] bg-[#1E1C1A]/60 border border-[#3A3833]/50">
                        {rec.styleName}
                      </span>
                      {rec.safeZoneMeta && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#D97757] bg-[#D97757]/10 border border-[#D97757]/20">
                          Zona segura
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleApply(rec, idx)}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                        appliedIndex === idx
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "text-[#D97757] border border-[#D97757]/30 hover:bg-[#D97757]/10"
                      }`}
                    >
                      {appliedIndex === idx ? "✓ Aplicado" : "Aplicar recomendación"}
                    </button>
                  </div>
                ))}

                {appliedDetails && (
                  <div className="rounded-xl p-3 mt-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <p className="text-xs font-semibold text-emerald-400 mb-2">✓ Recomendación aplicada al generador</p>
                    <div className="text-xs text-[#F5F0E8] space-y-0.5">
                      {appliedDetails.productDescription && (
                        <p><span className="text-[#9CA3AF]">Producto:</span> {appliedDetails.productDescription}</p>
                      )}
                      <p><span className="text-[#9CA3AF]">Ángulo:</span> {appliedDetails.angleName}</p>
                      <p><span className="text-[#9CA3AF]">Estilo:</span> {appliedDetails.styleName}</p>
                      <p><span className="text-[#9CA3AF]">Formato:</span> {formatLabels[appliedDetails.format] ?? appliedDetails.format}</p>
                      <p><span className="text-[#9CA3AF]">Zona Segura Meta:</span> {appliedDetails.safeZoneMeta ? "Activada" : "Desactivada"}</p>
                    </div>
                  </div>
                )}

                <button onClick={handleReset} className="text-xs font-medium text-[#9CA3AF] hover:text-[#F5F0E8] transition-colors flex items-center gap-1 ml-1">
                  <svg className="w-3 h-3" width={12} height={12} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Nueva consulta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zona de entrada (solo en collecting y confirming) */}
        {(convState === "collecting" || convState === "confirming") && (
          <div
            className="flex-shrink-0 p-3 relative z-10"
            style={{ borderTop: "1px solid rgba(58,56,51,0.5)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder="Escribe tu respuesta..."
                className="flex-1 resize-none bg-[#1E1C1A] border border-[#3A3833] px-3.5 py-2.5 rounded-xl text-sm text-[#F5F0E8] placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                    e.preventDefault()
                    handleRecommend()
                  }
                }}
              />
              <button
                onClick={handleRecommend}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.95] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Enviar"
              >
                <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}