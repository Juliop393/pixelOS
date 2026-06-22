"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"

const ANGLES = [
  {
    id: "problem-solution",
    title: "Problema y Solución",
    description: "Identifica el dolor del cliente y posiciona tu producto como la solución obvia. Alto CTR en frío.",
    icon: "⚡",
    badges: [
      { label: "CTR", value: "Alto", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      { label: "Formato", value: "Letrero", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    ],
  },
  {
    id: "social-proof",
    title: "Prueba Social (Reseñas)",
    description: "Simula testimonios reales. Genera confianza inmediata y reduce la fricción de compra.",
    icon: "💬",
    badges: [
      { label: "Conversión", value: "Alta", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      { label: "Formato", value: "Prueba Social", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    ],
  },
  {
    id: "product-demo",
    title: "Demostración de Producto",
    description: "El producto es el héroe. Ideal para mostrar características y diferenciadores visuales.",
    icon: "◎",
    badges: [
      { label: "Audiencia", value: "Tibia", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
      { label: "Formato", value: "Producto", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    ],
  },
  {
    id: "direct-offer",
    title: "Oferta Directa",
    description: "Precio, descuento, urgencia. Para audiencias calientes y campañas de retargeting.",
    icon: "🔥",
    badges: [
      { label: "Audiencia", value: "Caliente", color: "bg-red-500/10 text-red-400 border-red-500/20" },
      { label: "Formato", value: "Retargeting", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    ],
  },
  {
    id: "comparison",
    title: "Comparación Directa",
    description: "Muestra por qué eres la mejor opción. Ideal para mercados competitivos y clientes indecisos.",
    icon: "⚡",
    badges: [
      { label: "Decisión", value: "Alta", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
      { label: "Formato", value: "Versus", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    ],
  },
  {
    id: "scarcity",
    title: "Escasez y Urgencia",
    description: "Últimas unidades, tiempo limitado. Activa el miedo a perderse algo (FOMO) y acelera la decisión de compra.",
    icon: "🔥",
    badges: [
      { label: "FOMO", value: "Máximo", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
      { label: "Formato", value: "Urgencia", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    ],
  },
]

const ASPECT_RATIOS = [
  { id: "square", label: "1:1", description: "Cuadrado" },
  { id: "story", label: "9:16", description: "Vertical" },
  { id: "4:5", label: "4:5", description: "Feed Mobile" },
]

const VISUAL_STYLES = [
  { id: "white-bg", label: "Fondo Blanco (Studio)", icon: "📷" },
  { id: "lifestyle", label: "Lifestyle & Contexto", icon: "🌿" },
  { id: "ugc", label: "UGC Style", icon: "📱" },
  { id: "before-after", label: "Antes / Después", icon: "🔄" },
]

const VARIATIONS = [
  { id: "text-only", label: "Solo Texto" },
  { id: "image-only", label: "Solo Imagen" },
  { id: "both", label: "Ambos" },
]

const LOADING_MESSAGES = [
  "Estructurando anuncio...",
  "Aplicando psicología de color...",
  "Optimizando para conversión...",
  "Renderizando en alta calidad...",
  "Finalizando creativo...",
]

function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev
        return prev + Math.random() * 8
      })
    }, 400)

    return () => {
      clearInterval(messageInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
      <div className="w-full max-w-sm text-center">
        <div className="relative w-20 h-20 mx-auto mb-10">
          <div className="absolute inset-0 rounded-full border-2 border-[#D97757]/10" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#D97757] animate-spin"
            style={{ animationDuration: "1.5s" }}
          />
          <div className="absolute inset-3 rounded-full bg-[#D97757]/5 flex items-center justify-center">
            <span className="text-[#D97757] text-lg font-bold">AI</span>
          </div>
        </div>

        <p className="text-[#E8E6E1] font-medium text-lg mb-6 min-h-[28px] transition-opacity duration-300">
          {LOADING_MESSAGES[messageIndex]}
        </p>

        <div className="w-full h-1 bg-[#3A3833] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D97757] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-[#3A3833] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#2A2826] hover:bg-[#3A3833] transition-colors"
      >
        <span className="text-sm font-semibold text-[#E8E6E1]">{title}</span>
        <svg
          className={`w-4 h-4 text-[#9A9893] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-[#2A2826] border-t border-[#3A3833]">
          {children}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { credits, setCredits } = useCredits()
  const [producto, setProducto] = useState("")
  const [textoAnuncio, setTextoAnuncio] = useState("")
  const [ctaContacto, setCtaContacto] = useState("")
  const [aspectRatio, setAspectRatio] = useState("square")
  const [visualStyle, setVisualStyle] = useState("photorealistic")
  const [brandColor, setBrandColor] = useState("")
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    imageUrl: string
    copy: string
    angle: string
  } | null>(null)
  const [selectedVariation, setSelectedVariation] = useState("both")
  const [phase, setPhase] = useState<"select" | "loading" | "result" | "error">("select")
  const [sessionHistory, setSessionHistory] = useState<Array<{ imageUrl: string; angle: string }>>([])

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      }
    }
    checkSession()
  }, [router])

  const handleSelectAngle = (angleId: string) => {
    setSelectedAngle(angleId)
  }

  const handleGenerate = async () => {
    if (!producto.trim() || !selectedAngle) {
      toast.error("Completa los campos requeridos", {
        description: "Ingresa tu producto y selecciona un ángulo",
      })
      return
    }

    if (credits < 1) {
      toast.error("Sin créditos disponibles", {
        description: "No tienes créditos suficientes para generar",
      })
      return
    }

    setLoading(true)
    setError(null)
    setPhase("loading")
    setCredits((prev) => prev - 1)

    const payload = {
      producto,
      textoAnuncio: textoAnuncio || null,
      ctaContacto: ctaContacto || null,
      angulo: selectedAngle,
      formato: aspectRatio,
      estiloVisual: visualStyle,
      brandColor: brandColor || null,
      userId: "user_beta_001",
    }

    console.log("Payload enviado al webhook:", payload)

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "http://localhost:5678/webhook/generar-creativo"
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.imageUrl) {
        const newResult = {
          imageUrl: data.imageUrl,
          copy: data.copy || "Tu copy persuasivo aparecerá aquí una vez que el motor de IA complete el renderizado del creativo.",
          angle: selectedAngle,
        }
        setResult(newResult)
        setPhase("result")
        setSessionHistory((prev) => {
          const newHistory = [{ imageUrl: data.imageUrl, angle: selectedAngle }, ...prev]
          return newHistory.slice(0, 20)
        })

        // Guardar en localStorage para "Mis Creativos"
        const savedCreativos = JSON.parse(localStorage.getItem("afm_creativos") || "[]")
        const newCreativo = {
          id: Date.now(),
          imageUrl: data.imageUrl,
          producto: producto,
          angulo: selectedAngle,
          formato: aspectRatio,
          fecha: new Date().toISOString(),
        }
        savedCreativos.unshift(newCreativo)
        localStorage.setItem("afm_creativos", JSON.stringify(savedCreativos.slice(0, 50)))

        toast.success("Creativo generado", {
          description: "Tu anuncio está listo para publicar",
        })
      } else {
        throw new Error("Respuesta inválida del servidor")
      }
    } catch (error) {
      console.error("Error al generar creativo:", error)
      setCredits((prev) => prev + 1)
      setError(error instanceof Error ? error.message : "Error desconocido")
      setPhase("error")
      
      toast.error("Error al generar creativo", {
        description: "Hubo un error generando tu creativo. Intenta de nuevo.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    if (selectedAngle) {
      handleSelectAngle(selectedAngle)
    }
  }

  const handleDownload = () => {
    if (result?.imageUrl) {
      const link = document.createElement("a")
      link.href = result.imageUrl
      link.download = `creativo-${selectedAngle}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success("Descarga iniciada", {
        description: "Tu creativo se está descargando",
      })
    }
  }

  const handleFeedback = (type: "positive" | "negative") => {
    toast.success("¡Gracias por tu feedback!", {
      description: type === "positive" ? "Nos alegra que te haya funcionado" : "Seguiremos mejorando",
    })
  }

  const handleExportToMeta = () => {
    toast.info("Exportando a Meta Ads", {
      description: "Función disponible próximamente",
    })
  }

  const selectedAngleData = ANGLES.find((a) => a.id === selectedAngle)

  return (
    <div className="flex gap-6 h-full">
            {/* COLUMNA 1: Parámetros */}
            <div className="w-[320px] flex-shrink-0 space-y-6">
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

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!producto.trim() || !selectedAngle || loading || credits === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D97757] disabled:active:scale-100 mb-3"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generando tu creativo...
                    </>
                  ) : credits === 0 ? (
                    "Sin créditos disponibles"
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generar Creativo
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-[#9A9893] border border-[#3A3833] hover:border-[#D97757]/30 hover:text-[#E8E6E1] transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Subir imagen de referencia (Opcional)
                </button>
              </div>

              <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
                <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
                  Formato
                </h3>
                <div className="space-y-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        aspectRatio === ratio.id
                          ? "bg-[#D97757] text-white"
                          : "bg-[#1E1C1A] text-[#9A9893] hover:bg-[#3A3833]"
                      }`}
                    >
                      <span className="font-bold">{ratio.label}</span>
                      <span className="text-xs opacity-60">{ratio.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
                <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
                  Estilo Visual
                </h3>
                <div className="space-y-2">
                  {VISUAL_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setVisualStyle(style.id)}
                      className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        visualStyle === style.id
                          ? "bg-[#D97757] text-white"
                          : "bg-[#1E1C1A] text-[#9A9893] hover:bg-[#3A3833]"
                      }`}
                    >
                      <span className="text-lg">{style.icon}</span>
                      <span>{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Accordion title="Ajustes Avanzados">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
                      Color Principal de la Marca (Opcional)
                    </label>
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="Ej: #D97757"
                      className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2.5 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                    />
                  </div>
                </div>
              </Accordion>

              {phase === "result" && (
                <button
                  onClick={() => {
                    setResult(null)
                    setSelectedAngle(null)
                    setPhase("select")
                  }}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#1E1C1A] text-[#E8E6E1] font-semibold text-sm border border-[#3A3833] hover:border-[#D97757]/50 active:scale-[0.98] transition-all duration-200"
                >
                  Nuevo ángulo
                </button>
              )}
            </div>

            {/* COLUMNA 2: Ángulos de Venta */}
            <div className="w-[380px] flex-shrink-0">
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
                      onClick={() => handleSelectAngle(angle.id)}
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
            </div>

            {/* COLUMNA 3: Lienzo / Resultados */}
            <div className="flex-1 min-w-0">
              {phase === "select" && (
                <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center mx-auto mb-5">
                      <svg
                        className="w-10 h-10 text-[#9A9893]/30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-[#9A9893] font-medium mb-1">
                      Selecciona un ángulo
                    </p>
                    <p className="text-[#9A9893]/50 text-sm">
                      El creativo aparecerá aquí
                    </p>
                  </div>
                </div>
              )}

              {phase === "loading" && (
                <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] h-full">
                  <LoadingState />
                </div>
              )}

              {phase === "error" && (
                <div className="bg-[#2A2826] rounded-2xl border border-red-500/30 h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                      <svg
                        className="w-10 h-10 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <p className="text-red-400 font-medium mb-2">
                      Hubo un error generando tu creativo
                    </p>
                    <p className="text-[#9A9893]/70 text-sm mb-6">
                      {error || "Intenta de nuevo"}
                    </p>
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}

              {phase === "result" && result && (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] overflow-hidden flex-shrink-0">
                    <div
                      className={`relative bg-[#1E1C1A] flex items-center justify-center overflow-hidden ${
                        aspectRatio === "story" ? "aspect-[9/16] max-h-[500px]" : aspectRatio === "4:5" ? "aspect-[4/5] max-h-[450px]" : "aspect-square max-h-[400px]"
                      }`}
                    >
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt="Creativo generado"
                          className={`w-full h-full ${aspectRatio === "story" || aspectRatio === "4:5" ? "object-contain" : "object-cover"}`}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mb-4">
                            <svg
                              className="w-8 h-8 text-[#D97757]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <p className="text-[#9A9893] text-sm font-medium">
                            Vista previa del creativo
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-5 border-t border-[#3A3833]">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">
                          {selectedAngleData?.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#E8E6E1] mb-1">
                            {selectedAngleData?.title}
                          </p>
                          <p className="text-sm text-[#9A9893] leading-relaxed">
                            {result.copy}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-4 flex-shrink-0">
                    <div className="space-y-3">
                      <button
                        onClick={handleDownload}
                        className="w-full py-3 px-4 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar
                      </button>

                      <div className="pt-2">
                        <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
                          ¿Cómo quedó?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFeedback("positive")}
                            className="flex-1 py-2 px-3 rounded-lg bg-[#1E1C1A] text-[#E8E6E1] text-xs font-medium border border-[#3A3833] hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-200"
                          >
                            ✅ Útil
                          </button>
                          <button
                            onClick={() => handleFeedback("negative")}
                            className="flex-1 py-2 px-3 rounded-lg bg-[#1E1C1A] text-[#E8E6E1] text-xs font-medium border border-[#3A3833] hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
                          >
                            ❌ No útil
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sessionHistory.length > 0 && (
                    <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-4 flex-shrink-0">
                      <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-3">
                        Historial de sesión
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {sessionHistory.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setResult({
                                imageUrl: item.imageUrl,
                                copy: "",
                                angle: item.angle,
                              })
                            }}
                            className="aspect-square rounded-lg overflow-hidden border border-[#3A3833] hover:border-[#D97757]/50 transition-all duration-200"
                          >
                            <img
                              src={item.imageUrl}
                              alt={`Creativo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
    </div>
  )
}
