"use client"

import { useEffect, useRef, useState } from "react"
import { Clapperboard, Lightbulb, ListVideo, Sparkles, Target, Zap } from "lucide-react"
import styles from "./GeneratorWorkspace.module.css"

export type Recommendation = {
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

export type PixelAiInitialRequest = {
  id: number
  message: string
}

function detectRecommendationCount(message: string): 1 | 2 | 3 | null {
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  const mentionsAngles = /\bangulos?\b/.test(normalized)
  const requestsRecommendation = /\b(recomiend\w*|recomend\w*|sugier\w*|suger\w*|propon\w*|dame|quiero|necesito)\b/.test(normalized)
  if (!mentionsAngles || !requestsRecommendation) return null

  const numericCount = normalized.match(/\b([123])\b/)
  if (numericCount) return Number(numericCount[1]) as 1 | 2 | 3
  if (/\btres\b/.test(normalized)) return 3
  if (/\bdos\b/.test(normalized)) return 2
  if (/\b(un|uno|una)\b/.test(normalized)) return 1
  return 3
}

interface PixelAdvisorProps {
  onApplyRecommendation?: (rec: Recommendation) => void
  accessToken?: string
  hideBubble?: boolean
  inline?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialRequest?: PixelAiInitialRequest | null
  focusMode?: boolean
  videoContext?: boolean
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Cuéntame qué vendes, a quién se lo vendes y qué quieres conseguir con el anuncio.",
}

const VIDEO_INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Puedo ayudarte a encontrar un ángulo, proponer un hook y ordenar las escenas de tu video. Cuéntame tu idea o elige un punto de partida.",
}

const VIDEO_STARTERS = [
  { label: "Recomiéndame un ángulo", prompt: "Recomiéndame un ángulo para un anuncio de video y dime qué dato necesitas para afinarlo.", Icon: Target },
  { label: "Propón un hook", prompt: "Propón tres ideas de hook para abrir un video publicitario. Si necesitas contexto, dime cuál.", Icon: Zap },
  { label: "Arma un storyboard rápido", prompt: "Arma un storyboard breve para un anuncio de video. Dame un ejemplo adaptable por escenas de seis segundos.", Icon: ListVideo },
  { label: "Estructura mi video", prompt: "Ayúdame a estructurar un anuncio de video: apertura, demostración, beneficio y cierre.", Icon: Clapperboard },
  { label: "Algo simple y directo", prompt: "Quiero un anuncio de video simple y directo. Dame un enfoque fácil de ejecutar.", Icon: Lightbulb },
]

export default function PixelAdvisor({ onApplyRecommendation, accessToken, hideBubble, inline = false, open, onOpenChange, initialRequest, focusMode = false, videoContext = false }: PixelAdvisorProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isOpen = open ?? uncontrolledOpen
  const setIsOpen = (next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const [input, setInput] = useState("")
  const [convState, setConvState] = useState<ConvState>("collecting")
  const [messages, setMessages] = useState<Message[]>([videoContext ? VIDEO_INITIAL_MESSAGE : INITIAL_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collectedContext, setCollectedContext] = useState<Record<string, unknown>>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [summary, setSummary] = useState("")
  const [confirmationMessage, setConfirmationMessage] = useState("")
  const [requestedRecommendationCount, setRequestedRecommendationCount] = useState<1 | 2 | 3>(3)
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null)
  const [appliedDetails, setAppliedDetails] = useState<Recommendation | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const processedInitialRequest = useRef<number | null>(null)

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
    setMessages([videoContext ? VIDEO_INITIAL_MESSAGE : INITIAL_MESSAGE])
    setInput("")
    setCollectedContext({})
    setRecommendations([])
    setSummary("")
    setConfirmationMessage("")
    setRequestedRecommendationCount(3)
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
          assistantContext: videoContext ? "video" : undefined,
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

  const submitMessage = async (message: string) => {
    const userMessage = message.trim()
    if (!userMessage || isLoading) return

    const detectedCount = detectRecommendationCount(userMessage)
    if (detectedCount !== null) setRequestedRecommendationCount(detectedCount)

    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setInput("")

    await sendChatMessage(userMessage)
  }

  const handleRecommend = () => { void submitMessage(input) }

  useEffect(() => {
    if (!isOpen || !accessToken || !initialRequest || isLoading) return
    if (processedInitialRequest.current === initialRequest.id) return

    const userMessage = initialRequest.message.trim()
    if (!userMessage) return

    processedInitialRequest.current = initialRequest.id
    const detectedCount = detectRecommendationCount(userMessage)
    if (detectedCount !== null) setRequestedRecommendationCount(detectedCount)
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setInput("")
    void sendChatMessage(userMessage)
  }, [accessToken, initialRequest, isLoading, isOpen])

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
          recommendationCount: requestedRecommendationCount,
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
      {!hideBubble && (
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir Pixel IA"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 animate-pulse ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background: "linear-gradient(135deg, var(--pf-elevated), var(--pf-card))",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--pf-ai-border)",
          boxShadow: "0 4px 20px rgba(143,211,255,.06), var(--pf-highlight)",
          animationDuration: "3s",
        }}
      >
        <Sparkles className="w-5 h-5 text-[var(--pf-ai)]" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-[var(--pf-primary)]">Pixel IA</span>
      </button>
      )}

      {/* Panel de conversación: inline para compatibilidad o drawer lateral reutilizable. */}
      {isOpen && <div
        id="pixel-ai-panel"
        aria-label="Panel de Pixel IA"
        role="dialog"
        className={inline ? styles.aiPanel : `${styles.drawerPanel} ${focusMode ? styles.drawerFocusPanel : ""} ${videoContext ? styles.videoAssistantPanel : ""}`}
        style={{
          background: "linear-gradient(155deg, var(--pf-card), var(--pf-panel) 68%)",
          backdropFilter: "blur(28px) saturate(150%)",
          WebkitBackdropFilter: "blur(28px) saturate(150%)",
          border: "1px solid var(--pf-ai-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,.48), var(--pf-highlight)",
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
          className={`flex-shrink-0 px-5 py-3.5 flex items-center justify-between relative z-10 ${videoContext ? styles.videoAssistantHeader : ""}`}
          style={{ borderBottom: "1px solid var(--pf-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--pf-ai-tint)",
                border: "1px solid var(--pf-ai-border)",
              }}
            >
              <Sparkles className="w-4 h-4 text-[var(--pf-ai)]" strokeWidth={1.5} />
            </div>
            <div className={videoContext ? styles.videoAssistantTitle : undefined}>
              <span className="text-sm font-bold text-[var(--pf-headline)]">Pixel IA</span>
              <span className={videoContext ? "" : "text-[10px] text-[var(--pf-secondary)] ml-2 hidden sm:inline"}>
                {videoContext ? "Copiloto creativo de Video" : "Estrategia creativa para tus anuncios."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--pf-secondary)] hover:text-[var(--pf-primary)] hover:bg-[var(--pf-elevated)] transition-colors" title="Minimizar">
              <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button onClick={handleClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--pf-secondary)] hover:text-[var(--pf-primary)] hover:bg-[var(--pf-elevated)] transition-colors" title="Cerrar">
              <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Área de conversación */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 relative z-10 ${videoContext ? styles.videoAssistantConversation : ""}`}>
          {videoContext && messages.length === 1 && <section className={styles.videoAssistantWelcome}>
            <div className={styles.videoAssistantWelcomeIcon}><Clapperboard /></div>
            <span>IDEAS PARA TU VIDEO</span>
            <h2>Del primer hook a la última escena.</h2>
            <p>{VIDEO_INITIAL_MESSAGE.content}</p>
            <div className={styles.videoAssistantStarters}>
              {VIDEO_STARTERS.map(({ label, prompt, Icon }) => <button type="button" key={label} disabled={isLoading} onClick={() => { void submitMessage(prompt) }}><Icon /><span>{label}</span></button>)}
            </div>
            <small>Ideas para revisar en el chat; tus escenas no cambian automáticamente.</small>
          </section>}
          {messages.map((msg, idx) => {
            if (videoContext && idx === 0) return null
            const isUser = msg.role === "user"
            return (
              <div key={idx} className={`flex items-start gap-2 ${isUser ? "justify-end" : ""}`}>
                {!isUser && (
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: "var(--pf-ai-tint)",
                      border: "1px solid var(--pf-ai-border)",
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[var(--pf-ai)]" strokeWidth={1.5} />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] ${
                    isUser ? "rounded-tr-md" : "rounded-tl-md"
                  }`}
                  style={
                    isUser
                      ? {
                          background: "linear-gradient(135deg, var(--pf-elevated), var(--pf-card))",
                          border: "1px solid var(--pf-ai-border)",
                        }
                      : {
                          background: "var(--pf-elevated)",
                          border: "1px solid var(--pf-border)",
                        }
                  }
                >
                  <p className="text-sm text-[var(--pf-primary)] leading-relaxed">{msg.content}</p>

                  {/* Botones de confirmación en el último mensaje del asistente */}
                  {convState === "confirming" && !isUser && idx === messages.length - 1 && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-[var(--pf-ai)] text-[var(--pf-action-ink)] hover:bg-[var(--pf-ai-hover)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                      >
                        {isLoading ? "..." : "Sí, recomendar ángulos"}
                      </button>
                      <button
                        onClick={handleCorrect}
                        disabled={isLoading}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-[var(--pf-secondary)] border border-[var(--pf-border)] hover:border-[var(--pf-ai)] hover:text-[var(--pf-primary)] transition-colors disabled:opacity-50"
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
                  background: "var(--pf-ai-tint)",
                  border: "1px solid var(--pf-ai-border)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--pf-ai)]" strokeWidth={1.5} />
              </div>
              <div
                className="rounded-2xl rounded-tl-md px-4 py-3"
                style={{ background: "var(--pf-elevated)", border: "1px solid var(--pf-border)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--pf-ai)] animate-pulse" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--pf-ai)] animate-pulse" style={{ animationDelay: "200ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[var(--pf-ai)] animate-pulse" style={{ animationDelay: "400ms" }} />
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
                  background: "var(--pf-ai-tint)",
                  border: "1px solid var(--pf-ai-border)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--pf-ai)]" strokeWidth={1.5} />
              </div>
              <div className="max-w-[85%] space-y-2">
                <div className="rounded-2xl rounded-tl-md px-3.5 py-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-sm text-[var(--pf-primary)]">{error}</p>
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
                  background: "var(--pf-ai-tint)",
                  border: "1px solid var(--pf-ai-border)",
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--pf-ai)]" strokeWidth={1.5} />
              </div>
              <div className="max-w-[90%] space-y-2.5">
                {summary && <p className="text-xs text-[var(--pf-secondary)] ml-1">{summary}</p>}

                {recommendations.map((rec, idx) => (
                  <div key={idx} className="rounded-xl p-3" style={{ background: "var(--pf-elevated)", border: "1px solid var(--pf-border)" }}>
                    <p className="text-sm font-bold text-[var(--pf-primary)] mb-1">{rec.angleName}</p>
                    <p className="text-xs text-[var(--pf-secondary)] mb-2 leading-relaxed">{rec.reason}</p>
                    <div className="flex gap-1.5 mb-2.5 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-[var(--pf-secondary)] bg-[var(--pf-panel)] border border-[var(--pf-border)]">
                        {formatLabels[rec.format] ?? rec.format}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-[var(--pf-secondary)] bg-[var(--pf-panel)] border border-[var(--pf-border)]">
                        {rec.styleName}
                      </span>
                      {rec.safeZoneMeta && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold text-[var(--pf-ai)] bg-[var(--pf-ai-tint)] border border-[var(--pf-ai-border)]">
                          Zona segura
                        </span>
                      )}
                    </div>
                    {onApplyRecommendation && <button
                      onClick={() => handleApply(rec, idx)}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                        appliedIndex === idx
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "text-[var(--pf-ai)] border border-[var(--pf-ai-border)] hover:bg-[var(--pf-ai-tint)]"
                      }`}
                    >
                      {appliedIndex === idx ? "✓ Aplicado" : "Aplicar recomendación"}
                    </button>}
                  </div>
                ))}

                {onApplyRecommendation && appliedDetails && (
                  <div className="rounded-xl p-3 mt-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <p className="text-xs font-semibold text-emerald-400 mb-2">✓ Recomendación aplicada al generador</p>
                    <div className="text-xs text-[var(--pf-primary)] space-y-0.5">
                      {appliedDetails.productDescription && (
                        <p><span className="text-[var(--pf-secondary)]">Producto:</span> {appliedDetails.productDescription}</p>
                      )}
                      <p><span className="text-[var(--pf-secondary)]">Ángulo:</span> {appliedDetails.angleName}</p>
                      <p><span className="text-[var(--pf-secondary)]">Estilo:</span> {appliedDetails.styleName}</p>
                      <p><span className="text-[var(--pf-secondary)]">Formato:</span> {formatLabels[appliedDetails.format] ?? appliedDetails.format}</p>
                      <p><span className="text-[var(--pf-secondary)]">Zona Segura Meta:</span> {appliedDetails.safeZoneMeta ? "Activada" : "Desactivada"}</p>
                    </div>
                  </div>
                )}

                <button onClick={handleReset} className="text-xs font-medium text-[var(--pf-secondary)] hover:text-[var(--pf-primary)] transition-colors flex items-center gap-1 ml-1">
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
            className={`flex-shrink-0 p-3 relative z-10 ${videoContext ? styles.videoAssistantComposer : ""}`}
            style={{ borderTop: "1px solid var(--pf-border)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder={videoContext ? "Describe tu video o pide una idea para avanzar..." : "Escribe tu respuesta..."}
                className="flex-1 resize-none bg-[var(--pf-input)] border border-[var(--pf-border)] px-3.5 py-2.5 rounded-xl text-sm text-[var(--pf-primary)] placeholder:text-[var(--pf-tertiary)] focus:outline-none focus:border-[var(--pf-ai)] focus:shadow-[var(--pf-ai-focus)] transition-colors"
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
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-[var(--pf-ai)] text-[var(--pf-action-ink)] hover:bg-[var(--pf-ai-hover)] active:scale-[0.95] transition-all duration-200 shadow-lg shadow-[#8FD3FF]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Enviar"
              >
                <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>}
    </>
  )
}
