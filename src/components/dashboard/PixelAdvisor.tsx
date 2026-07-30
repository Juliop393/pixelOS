"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles } from "lucide-react"

type Recommendation = {
  angleId: string
  angleName: string
  reason: string
  styleId: string
  styleName: string
  format: string
  safeZoneMeta: boolean
}

type ChatMessage = { role: "user" | "assistant"; content: string }
type ConversationState = "initial" | "collecting" | "confirming" | "recommending" | "completed"

interface PixelAdvisorProps {
  onApplyRecommendation?: (rec: Recommendation) => void
  accessToken?: string
}

export default function PixelAdvisor({ onApplyRecommendation, accessToken }: PixelAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationState, setConversationState] = useState<ConversationState>("initial")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [apiMessages, setApiMessages] = useState<{ role: string; content: string }[]>([])
  const [pendingSummary, setPendingSummary] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [summary, setSummary] = useState("")
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, isLoading, recommendations, error])

  const addAssistantMessage = (content: string) => {
    setChatMessages((prev) => [...prev, { role: "assistant", content }])
  }

  const startChat = () => {
    setConversationState("collecting")
    const greeting =
      "Cuéntame qué vendes, a quién se lo vendes y qué quieres conseguir con el anuncio."
    setChatMessages([{ role: "assistant", content: greeting }])
    setApiMessages([])
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    if (!accessToken) {
      setError("Sesión expirada. Vuelve a iniciar sesión.")
      return
    }

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)
    setError(null)

    const newUserMsg: ChatMessage = { role: "user", content: userMessage }
    setChatMessages((prev) => [...prev, newUserMsg])

    if (conversationState === "confirming") {
      // User is confirming or correcting
      const lowerMsg = userMessage.toLowerCase()
      const isConfirming =
        lowerMsg.includes("sí") ||
        lowerMsg.includes("si") ||
        lowerMsg.includes("correcto") ||
        lowerMsg.includes("recomendar") ||
        lowerMsg.includes("recomienda") ||
        lowerMsg.includes("genera") ||
        lowerMsg.includes("confirmado") ||
        lowerMsg.includes("ok") ||
        lowerMsg.includes("dale") ||
        lowerMsg.includes("adelante")

      if (isConfirming) {
        await requestRecommendations()
        return
      }

      // User wants to correct
      addAssistantMessage(
        "Entendido. Cuéntame qué necesitas corregir o agregar para entender mejor tu negocio."
      )
      setConversationState("collecting")
      setPendingSummary(null)
      setApiMessages([])
      setIsLoading(false)
      return
    }

    // collecting state: send to chat endpoint
    const newApiMessages = [...apiMessages, { role: "user", content: userMessage }]
    setApiMessages(newApiMessages)

    try {
      const res = await fetch("/api/pixel-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "chat", messages: newApiMessages }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.providerStatus
          ? `Error IA (${data.providerStatus}${data.providerCode ? ` — ${data.providerCode}` : ""})${data.providerMessage ? `: ${data.providerMessage}` : ""}`
          : data.error || "Error al consultar Pixel IA"
        setError(msg)
        setIsLoading(false)
        return
      }

      const assistantContent = data.message || "Cuéntame más sobre tu negocio."
      addAssistantMessage(assistantContent)

      const updatedApiMessages = [...newApiMessages, { role: "assistant", content: assistantContent }]
      setApiMessages(updatedApiMessages)

      if (data.hasEnoughInfo && data.summary) {
        setPendingSummary(data.summary)
        setConversationState("confirming")

        const confirmMsg = `Entendí que ${data.summary}\n\n¿Está correcto?`
        addAssistantMessage(confirmMsg)
      }
    } catch {
      setError("Error al conectar con Pixel IA")
    } finally {
      setIsLoading(false)
    }
  }

  const requestRecommendations = async () => {
    if (!pendingSummary || !accessToken) return

    setIsLoading(true)
    setError(null)
    setConversationState("recommending")

    const statusMsg = "Perfecto. Déjame analizar tu negocio y recomendarte los mejores ángulos..."
    addAssistantMessage(statusMsg)

    try {
      const res = await fetch("/api/pixel-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "recommend", summary: pendingSummary }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.providerStatus
          ? `Error IA (${data.providerStatus}${data.providerCode ? ` — ${data.providerCode}` : ""})${data.providerMessage ? `: ${data.providerMessage}` : ""}`
          : data.error || "Error al consultar Pixel IA"
        setError(msg)
        setConversationState("confirming")
        setIsLoading(false)
        return
      }

      setSummary(data.summary || "")
      setRecommendations(data.recommendations || [])
      setConversationState("completed")
    } catch {
      setError("Error al conectar con Pixel IA")
      setConversationState("confirming")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setError(null)
  }

  const handleNewQuery = () => {
    setInput("")
    setChatMessages([])
    setApiMessages([])
    setRecommendations([])
    setSummary("")
    setError(null)
    setPendingSummary(null)
    setAppliedIndex(null)
    setConversationState("initial")
  }

  const handleApply = (rec: Recommendation, idx: number) => {
    onApplyRecommendation?.(rec)
    setAppliedIndex(idx)
  }

  const formatLabels: Record<string, string> = {
    square: "1:1 Cuadrado",
    story: "9:16 Vertical",
    "4:5": "4:5 Feed Mobile",
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
        {/* Reflejo */}
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

        {/* Área de scroll */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 relative z-10">
          {conversationState === "initial" && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles className="w-8 h-8 text-[#D97757] mb-4" strokeWidth={1.5} />
              <p className="text-sm text-[#F5F0E8] mb-3">
                Tu asesor de estrategia para Meta Ads
              </p>
              <p className="text-xs text-[#9CA3AF] mb-5">
                Te ayudo a elegir el mejor ángulo, formato y estilo para tu anuncio.
              </p>
              <button
                onClick={startChat}
                className="px-6 py-2.5 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              >
                Comenzar
              </button>
            </div>
          )}

          {conversationState !== "initial" &&
            chatMessages.map((msg, idx) => {
              const isUser = msg.role === "user"
              const isLastAssistant =
                !isUser && msg.role === "assistant" && idx === chatMessages.length - 1

              // For the confirming state, render action buttons after the last assistant message
              const showConfirmActions =
                conversationState === "confirming" &&
                isLastAssistant &&
                !isLoading &&
                !recommendations.length

              return (
                <div key={idx}>
                  <div className={`flex items-start gap-2 ${isUser ? "justify-end" : ""}`}>
                    {!isUser && (
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
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] ${
                        isUser
                          ? "rounded-tr-md"
                          : "rounded-tl-md"
                      }`}
                      style={
                        isUser
                          ? {
                              background:
                                "linear-gradient(135deg, rgba(217,119,87,0.25) 0%, rgba(217,119,87,0.12) 100%)",
                              border: "1px solid rgba(217,119,87,0.15)",
                            }
                          : {
                              background: "rgba(42,40,38,0.6)",
                              border: "1px solid rgba(58,56,51,0.5)",
                            }
                      }
                    >
                      <p className="text-sm text-[#F5F0E8] leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>

                  {showConfirmActions && (
                    <div className="flex gap-2 ml-9 mt-2">
                      <button
                        onClick={() => {
                          setInput("")
                          requestRecommendations()
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.98] transition-all"
                      >
                        Sí, recomendar ángulos
                      </button>
                      <button
                        onClick={() => {
                          setInput("Quiero corregir algo")
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-[#9CA3AF] border border-[#3A3833] hover:text-[#F5F0E8] hover:border-[#D97757]/50 transition-colors"
                      >
                        Quiero corregir algo
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

          {/* Loading dots */}
          {isLoading && (
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
                <div
                  className="rounded-2xl rounded-tl-md px-3.5 py-2.5"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <p className="text-sm text-[#F5F0E8]">{error}</p>
                </div>
                <button
                  onClick={handleSend}
                  className="text-xs font-medium text-[#D97757] hover:text-[#E18A6E] transition-colors ml-1"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Recommendations in chat */}
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
                  <div
                    key={idx}
                    className="rounded-xl p-3"
                    style={{ background: "rgba(42,40,38,0.5)", border: "1px solid rgba(58,56,51,0.4)" }}
                  >
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
                <button
                  onClick={handleNewQuery}
                  className="text-xs font-medium text-[#9CA3AF] hover:text-[#F5F0E8] transition-colors flex items-center gap-1 ml-1"
                >
                  <svg className="w-3 h-3" width={12} height={12} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Nueva consulta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input (only show during collecting/confirming) */}
        {(conversationState === "collecting" || conversationState === "confirming") && (
          <div
            className="flex-shrink-0 p-3 relative z-10"
            style={{ borderTop: "1px solid rgba(58,56,51,0.5)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder={
                  conversationState === "confirming"
                    ? "Escribe Sí para confirmar, o indica qué corregir..."
                    : "Escribe tu respuesta..."
                }
                className="flex-1 resize-none bg-[#1E1C1A] border border-[#3A3833] px-3.5 py-2.5 rounded-xl text-sm text-[#F5F0E8] placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <button
                onClick={handleSend}
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