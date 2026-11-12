"use client"

import { useEffect, useRef, useState } from "react"
import { Clapperboard, Coins, Lightbulb, ListVideo, Megaphone, Target, Users, Zap } from "lucide-react"
import PixelAiIcon from "./PixelAiIcon"
import styles from "./GeneratorWorkspace.module.css"
import ui from "./PixelAdvisor.module.css"

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

/* "confirming" only follows an explicit request for structured recommendations; plain answers stay in "collecting". */
type ConvState = "collecting" | "confirming" | "recommending"

type Message = {
  role: "user" | "assistant"
  content: string
  /** Recommendation cards shown in place of this assistant message. */
  recommendations?: { summary: string; items: Recommendation[] }
}

/* The server accepts at most 10 messages of up to 2000 characters per request; older turns are
   dropped and earlier messages are cut here, so a long session never turns into HTTP 400. */
const MAX_HISTORY_MESSAGES = 10
const MAX_HISTORY_MESSAGE_CHARS = 2000

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

/* 429 and request errors carry a message written for the user; server failures stay generic. */
function errorFor(status: number, data: unknown, fallback: string) {
  const message = typeof data === "object" && data !== null ? (data as { error?: unknown }).error : null
  return (status === 429 || status === 400) && typeof message === "string" && message ? message : fallback
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
  content: "Soy PixelIA. Puedo ayudarte a crear mejores anuncios, explorar ideas y resolver dudas sobre PixelFM. ¿Qué tienes en mente?",
}

const VIDEO_INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Puedo ayudarte a encontrar un ángulo, proponer un hook y ordenar las escenas de tu video. Cuéntame tu idea o elige un punto de partida.",
}

const VIDEO_STARTERS = [
  { label: "Recomiéndame un ángulo", prompt: "Recomiéndame un ángulo para un anuncio de video.", Icon: Target },
  { label: "Propón un hook", prompt: "Propón tres ideas de hook para abrir un video publicitario. Si necesitas contexto, dime cuál.", Icon: Zap },
  { label: "Arma un storyboard rápido", prompt: "Arma un storyboard breve para un anuncio de video. Dame un ejemplo adaptable por escenas de diez segundos.", Icon: ListVideo },
  { label: "Estructura mi video", prompt: "Ayúdame a estructurar un anuncio de video: apertura, demostración, beneficio y cierre.", Icon: Clapperboard },
  { label: "Algo simple y directo", prompt: "Quiero un anuncio de video simple y directo. Dame un enfoque fácil de ejecutar.", Icon: Lightbulb },
]

const GENERAL_STARTERS = [
  { label: "Dame una idea de anuncio", prompt: "Dame una idea de anuncio para Meta Ads.", Icon: Megaphone },
  { label: "¿Me conviene un enfoque UGC?", prompt: "¿Me conviene un enfoque UGC para mis anuncios?", Icon: Users },
  { label: "¿Rápido o Premium?", prompt: "¿Qué diferencia hay entre Video Rápido y Video Premium?", Icon: Zap },
  { label: "¿Cómo funcionan los créditos?", prompt: "¿Cómo funcionan los créditos en PixelFM?", Icon: Coins },
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
  const [requestedRecommendationCount, setRequestedRecommendationCount] = useState<1 | 2 | 3>(3)
  const [appliedKey, setAppliedKey] = useState<string | null>(null)
  const [appliedDetails, setAppliedDetails] = useState<Recommendation | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const processedInitialRequest = useRef<number | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

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
    setRequestedRecommendationCount(3)
    setError(null)
    setAppliedKey(null)
    setAppliedDetails(null)
  }

  const sendChatMessage = async (userMessage: string, context?: Record<string, unknown>) => {
    if (!accessToken) {
      setError("Sesión expirada. Vuelve a iniciar sesión.")
      return
    }

    setIsLoading(true)
    setError(null)

    // The welcome text is interface copy, not conversation; cards travel as a short text summary.
    // Only the request is trimmed: the panel keeps showing the whole conversation.
    const chatMessages = [
      ...messages.slice(1).map((m) => ({
        role: m.role,
        content: (m.recommendations
          ? `Recomendé: ${m.recommendations.items.map((rec) => `${rec.angleName} (${rec.styleName}, ${rec.format})`).join("; ")}.`
          : m.content).slice(0, MAX_HISTORY_MESSAGE_CHARS),
      })),
      { role: "user", content: userMessage },
    ].slice(-MAX_HISTORY_MESSAGES)

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

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(errorFor(res.status, data, "No pudimos consultar PixelIA en este momento. Inténtalo nuevamente."))
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

      setConvState(data.type === "confirmation" ? "confirming" : "collecting")
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

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(errorFor(res.status, data, "Error al generar recomendaciones"))
        setConvState("confirming")
        return
      }

      const recs = (data.recommendations || []) as Recommendation[]
      if (data.productDescription) {
        for (const rec of recs) { rec.productDescription = data.productDescription as string }
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.summary || "", recommendations: { summary: data.summary || "", items: recs } }])
      setConvState("collecting")
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
  }

  const handleApply = (rec: Recommendation, key: string) => {
    onApplyRecommendation?.(rec)
    setAppliedKey(key)
    setAppliedDetails(rec)
  }

  const showWelcome = messages.length === 1
  const welcome = videoContext
    ? {
        Icon: Clapperboard,
        kicker: "IDEAS PARA TU VIDEO",
        title: "Del primer hook a la última escena.",
        text: VIDEO_INITIAL_MESSAGE.content,
        starters: VIDEO_STARTERS,
        note: "Ideas para revisar en el chat; tus escenas no cambian automáticamente.",
      }
    : {
        Icon: null,
        kicker: "PIXELIA · COPILOTO CREATIVO",
        title: "Pensemos tu próximo anuncio.",
        text: INITIAL_MESSAGE.content,
        starters: GENERAL_STARTERS,
        note: "Elige un punto de partida o escribe tu idea con tus palabras.",
      }

  const assistantAvatar = (
    <span className={ui.avatar} aria-hidden="true">
      <PixelAiIcon strokeWidth={1.6} />
    </span>
  )

  const renderRecommendations = (block: NonNullable<Message["recommendations"]>, messageIndex: number) => (
    <div key={messageIndex} className={ui.row}>
      {assistantAvatar}
      <div className={ui.recommendations}>
        {block.summary && <p className={ui.summary}>{block.summary}</p>}

        {block.items.map((rec, idx) => {
          const key = `${messageIndex}-${idx}`
          return (
            <div key={key} className={ui.recCard}>
              <span className={ui.recIndex}>0{idx + 1}</span>
              <p className={ui.recTitle}>{rec.angleName}</p>
              <p className={ui.recReason}>{rec.reason}</p>
              <div className={ui.recTags}>
                <span>{formatLabels[rec.format] ?? rec.format}</span>
                <span>{rec.styleName}</span>
                {rec.safeZoneMeta && <span className={ui.recTagAccent}>Zona segura</span>}
              </div>
              {onApplyRecommendation && <button
                type="button"
                onClick={() => handleApply(rec, key)}
                className={`${ui.applyButton} ${appliedKey === key ? ui.applyButtonDone : ""}`}
              >
                {appliedKey === key ? "✓ Aplicado" : "Aplicar recomendación"}
              </button>}
            </div>
          )
        })}

        {onApplyRecommendation && appliedDetails && appliedKey?.startsWith(`${messageIndex}-`) && (
          <div className={ui.appliedCard}>
            <p className={ui.appliedTitle}>✓ Recomendación aplicada al generador</p>
            <dl>
              {appliedDetails.productDescription && (
                <div><dt>Producto</dt><dd>{appliedDetails.productDescription}</dd></div>
              )}
              <div><dt>Ángulo</dt><dd>{appliedDetails.angleName}</dd></div>
              <div><dt>Estilo</dt><dd>{appliedDetails.styleName}</dd></div>
              <div><dt>Formato</dt><dd>{formatLabels[appliedDetails.format] ?? appliedDetails.format}</dd></div>
              <div><dt>Zona Segura Meta</dt><dd>{appliedDetails.safeZoneMeta ? "Activada" : "Desactivada"}</dd></div>
            </dl>
          </div>
        )}

        <button type="button" onClick={handleReset} className={ui.resetButton}>
          <svg width={12} height={12} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Nueva consulta
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Burbuja flotante */}
      {!hideBubble && (
      <button
        onClick={() => setIsOpen(true)}
        title="Abrir PixelIA"
        className={`${styles.pixelAiTrigger} ${ui.trigger} ${isOpen ? ui.triggerHidden : ""}`}
      >
        <PixelAiIcon className="w-5 h-5" strokeWidth={1.5} />
        <span>PixelIA</span>
      </button>
      )}

      {/* Panel de conversación: inline para compatibilidad o drawer lateral reutilizable. */}
      {isOpen && <div
        id="pixel-ai-panel"
        aria-label="Panel de PixelIA"
        role="dialog"
        className={`${inline ? styles.aiPanel : `${styles.drawerPanel} ${focusMode ? styles.drawerFocusPanel : ""} ${videoContext ? styles.videoAssistantPanel : ""} ${ui.drawer}`} ${ui.panel}`}
      >
        <span className={ui.panelSheen} aria-hidden="true" />

        {/* Cabecera */}
        <header className={ui.header}>
          <span className={ui.mark} aria-hidden="true">
            <PixelAiIcon strokeWidth={1.5} />
          </span>
          <div className={ui.titleBlock}>
            <b>PixelIA</b>
            <small>{videoContext ? "Copiloto creativo de Video" : "Estrategia creativa para tus anuncios"}</small>
          </div>
          <div className={ui.headerActions}>
            <button type="button" onClick={() => setIsOpen(false)} className={ui.iconButton} title="Minimizar" aria-label="Minimizar PixelIA">
              <svg width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button type="button" onClick={handleClose} className={ui.iconButton} title="Cerrar" aria-label="Cerrar PixelIA">
              <svg width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Área de conversación */}
        <div ref={scrollRef} className={ui.conversation}>
          {showWelcome && <section className={ui.welcome}>
            <span className={ui.welcomeMark} aria-hidden="true">
              {welcome.Icon ? <welcome.Icon /> : <PixelAiIcon strokeWidth={1.5} />}
            </span>
            <span className={ui.welcomeKicker}>{welcome.kicker}</span>
            <h2>{welcome.title}</h2>
            <p>{welcome.text}</p>
            <div className={ui.starters} data-count={welcome.starters.length}>
              {welcome.starters.map(({ label, prompt, Icon }) => (
                <button type="button" key={label} disabled={isLoading} onClick={() => { void submitMessage(prompt) }}>
                  <span className={ui.starterIcon} aria-hidden="true"><Icon /></span>
                  <span>{label}</span>
                  <svg className={ui.starterArrow} width={12} height={12} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </button>
              ))}
            </div>
            <small>{welcome.note}</small>
          </section>}

          {messages.map((msg, idx) => {
            if (idx === 0 && (videoContext || showWelcome)) return null
            if (msg.recommendations) return renderRecommendations(msg.recommendations, idx)
            const isUser = msg.role === "user"
            return (
              <div key={idx} className={`${ui.row} ${isUser ? ui.rowUser : ""}`}>
                {!isUser && assistantAvatar}
                <div className={`${ui.bubble} ${isUser ? ui.bubbleUser : ui.bubbleAssistant}`}>
                  <p>{msg.content}</p>

                  {/* Botones de confirmación en el último mensaje del asistente */}
                  {convState === "confirming" && !isUser && idx === messages.length - 1 && (
                    <div className={ui.confirmActions}>
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={ui.primaryAction}
                      >
                        {isLoading ? "..." : "Sí, recomendar ángulos"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCorrect}
                        disabled={isLoading}
                        className={ui.secondaryAction}
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
            <div className={ui.row} role="status" aria-label="PixelIA está pensando">
              {assistantAvatar}
              <div className={`${ui.bubble} ${ui.bubbleAssistant} ${ui.typing}`}>
                <i /><i /><i />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={ui.row} role="alert">
              {assistantAvatar}
              <div className={`${ui.bubble} ${ui.bubbleError}`}>
                <p>{error}</p>
              </div>
            </div>
          )}

        </div>

        {/* Zona de entrada: siempre disponible, también después de ver recomendaciones */}
        {(
          <div className={ui.composer}>
            <div className={ui.inputShell}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                aria-label="Mensaje para PixelIA"
                placeholder={videoContext ? "Describe tu video o pide una idea para avanzar..." : "Escribe tu pregunta o tu idea…"}
                className={ui.textarea}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                    e.preventDefault()
                    handleRecommend()
                  }
                }}
              />
              <div className={ui.inputFooter}>
                <small><kbd>Enter</kbd> enviar · <kbd>Shift</kbd> + <kbd>Enter</kbd> nueva línea</small>
                <button
                  type="button"
                  onClick={handleRecommend}
                  disabled={isLoading || !input.trim()}
                  className={ui.sendButton}
                  title="Enviar"
                  aria-label="Enviar mensaje"
                >
                  <svg width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19V5m0 0-6 6m6-6 6 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>}
    </>
  )
}
