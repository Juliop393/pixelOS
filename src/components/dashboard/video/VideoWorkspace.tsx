"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronDown, Compass, Palette, Sparkles, WandSparkles, Zap } from "lucide-react"
import { useVideoGenerator } from "@/hooks/useVideoGenerator"
import { supabase } from "@/lib/supabase"
import PixelAiDrawer from "@/components/dashboard/PixelAiDrawer"
import EditorHeader from "@/components/dashboard/EditorHeader"
import VideoPreview from "./VideoPreview"
import VideoSceneField from "./VideoSceneField"
import VideoSourcePicker from "./VideoSourcePicker"
import VideoStoryboard from "./VideoStoryboard"
import VideoTimeline from "./VideoTimeline"
import { CHUNK_PURPOSES, VIDEO_ANGLES, VIDEO_HOOKS, VIDEO_STYLES, type VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

type VideoTab = "reference" | "action" | "camera" | "dialogue" | "sceneStyle"
type VideoWorkspaceMode = "storyboard" | "advanced"

const VIDEO_TABS: { id: VideoTab; step: string; label: string }[] = [
  { id: "reference", step: "01", label: "Referencia visual" },
  { id: "action", step: "02", label: "Acción" },
  { id: "camera", step: "03", label: "Cámara" },
  { id: "dialogue", step: "04", label: "Diálogo / texto" },
  { id: "sceneStyle", step: "05", label: "Estilo de escena" },
]

const ACTION_SUGGESTIONS = ["Persona mostrando el producto", "Abrir una caja", "Usar el producto", "Caminar hacia cámara", "Producto girando", "Transformación antes / después"]
const CAMERA_SUGGESTIONS = ["Close-up", "Plano medio", "Handheld", "Travelling", "Paneo", "Toma cenital", "Dron", "Cámara fija"]
const DIALOGUE_SUGGESTIONS = ["Persona a cámara: ", "Voz en off: ", "Texto en pantalla: "]
const SCENE_STYLE_SUGGESTIONS = ["UGC natural", "Cinematográfico", "Estudio limpio", "Lifestyle", "Dinámico", "Premium", "Minimalista"]
const REFERENCE_SUGGESTIONS = ["Producto en primer plano", "Persona con el producto", "Empaque en contexto", "Referencia antes / después"]

const VIDEO_ANGLE_API_MAP: Record<string, string> = {
  problem: "problem-solution",
  benefit: "primary-benefit",
  demo: "product-demo",
  social: "social-proof",
  comparison: "comparison",
  experience: "usage-experience",
  offer: "offer-convenience",
  mechanism: "unique-mechanism",
}

const VIDEO_STYLE_API_MAP: Record<string, string> = {
  ugc: "lifestyle",
  cinematic: "premium-editorial",
  lifestyle: "lifestyle",
  demo: "product-action",
  editorial: "premium-editorial",
  commercial: "direct-offer",
  minimal: "minimal-tech",
  b2b: "b2b",
}

function SectionTitle({ step, title, description }: { step: string; title: string; description: string }) {
  return <div className={s.cardTitle}><i>{step}</i><div><h2>{title}</h2><p>{description}</p></div></div>
}

function createVideoChunk(id: number, purpose: string): VideoChunk {
  return {
    id,
    purpose,
    duration: 6,
    status: "pending",
    referenceSource: "library",
    referenceFileName: "",
    referenceDescription: "",
    action: "",
    camera: "",
    dialogue: "",
    sceneStyle: "",
    sceneDirection: "",
  }
}

export default function VideoWorkspace() {
  const nextId = useRef(2)
  const generatingChunkId = useRef<number | null>(null)
  const { videoUrl, videoPhase, videoError, generateVideo } = useVideoGenerator()
  const [fileError, setFileError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [angle, setAngle] = useState("demo")
  const [hook, setHook] = useState("result")
  const [style, setStyle] = useState("cinematic")
  const [activeTab, setActiveTab] = useState<VideoTab>("reference")
  const [workspaceMode, setWorkspaceMode] = useState<VideoWorkspaceMode>("storyboard")
  const [chunks, setChunks] = useState<VideoChunk[]>([createVideoChunk(1, CHUNK_PURPOSES[0])])
  const [activeId, setActiveId] = useState(1)
  const [strategyFeedback, setStrategyFeedback] = useState("")
  const [generateFeedback, setGenerateFeedback] = useState("")
  const [finalVideoUrl] = useState<string | null>(null)
  const [pixelAiOpen, setPixelAiOpen] = useState(false)

  const activeChunk = chunks.find((chunk) => chunk.id === activeId) ?? chunks[0]
  const activeIndex = chunks.findIndex((chunk) => chunk.id === activeId)
  const activeSource = activeChunk.referenceSource ?? "library"
  const activePreviewUrl = activeChunk.referenceImageUrl ?? null
  const activeFileName = activeChunk.referenceFileName ?? ""

  const updateChunk = (id: number, patch: Partial<VideoChunk>) => {
    setChunks((current) => current.map((chunk) => chunk.id === id ? { ...chunk, ...patch } : chunk))
  }
  const updateActiveChunk = (patch: Partial<VideoChunk>) => updateChunk(activeId, patch)
  const selectChunk = (id: number) => { setActiveId(id); setFileError(""); setGenerateFeedback("") }
  const clearPreview = () => {
    updateActiveChunk({ referenceImageUrl: undefined, referenceFileName: "", status: "pending" })
    setFileError("")
    setGenerateFeedback("")
  }
  const handleUpload = async (file?: File) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setFileError("Usa una imagen JPG, PNG o WEBP."); return }
    if (file.size > 5 * 1024 * 1024) { setFileError("La imagen debe pesar menos de 5 MB."); return }

    const targetChunkId = activeId
    updateChunk(targetChunkId, { referenceSource: "upload", referenceImageUrl: undefined, referenceFileName: file.name, status: "pending" })
    setFileError(""); setUploading(true); setGenerateFeedback("Subiendo referencia visual...")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("bucket", "referencias")
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data.success || typeof data.publicUrl !== "string") {
        throw new Error(data.error || "No se pudo subir la fuente visual")
      }
      if (!data.publicUrl.startsWith("https://")) throw new Error("La fuente visual no devolvió una URL segura")

      updateChunk(targetChunkId, { referenceSource: "upload", referenceImageUrl: data.publicUrl, referenceFileName: file.name, status: "configured" })
      setGenerateFeedback("Referencia visual lista para generar")
    } catch (error) {
      updateChunk(targetChunkId, { referenceImageUrl: undefined, status: "pending" })
      setFileError(error instanceof Error ? error.message : "No se pudo subir la fuente visual")
      setGenerateFeedback("")
    } finally {
      setUploading(false)
    }
  }
  const addChunk = () => { if (chunks.length >= 5) return; const chunk = createVideoChunk(nextId.current++, CHUNK_PURPOSES[chunks.length]); setChunks([...chunks, chunk]); selectChunk(chunk.id) }
  const removeChunk = (id: number) => { if (chunks.length === 1) return; const removedIndex = chunks.findIndex((chunk) => chunk.id === id); const next = chunks.filter((chunk) => chunk.id !== id); setChunks(next); if (activeId === id) setActiveId(next[Math.min(removedIndex, next.length - 1)].id) }
  const moveChunk = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= chunks.length) return; const next = [...chunks]; [next[index], next[target]] = [next[target], next[index]]; setChunks(next) }

  const angleLabel = VIDEO_ANGLES.find((item) => item.id === angle)?.label
  const hookLabel = VIDEO_HOOKS.find((item) => item.id === hook)?.label
  const styleLabel = VIDEO_STYLES.find((item) => item.id === style)?.label
  const canGenerate = Boolean(activeSource === "upload" && activePreviewUrl?.startsWith("https://") && angle && hook && style && activeChunk && !uploading && videoPhase !== "generating")
  const generatedChunks = chunks.filter((chunk) => chunk.status === "generated" && chunk.videoUrl)

  useEffect(() => {
    setChunks((current) => current.map((chunk) => (
      chunk.id !== activeId || ["generating", "generated", "error"].includes(chunk.status)
        ? chunk
        : { ...chunk, status: canGenerate ? "configured" : "pending" }
    )))
  }, [activeId, canGenerate])

  useEffect(() => {
    const chunkId = generatingChunkId.current
    if (chunkId === null) return

    if (videoPhase === "generated" && videoUrl) {
      setChunks((current) => current.map((chunk) => chunk.id === chunkId
        ? { ...chunk, status: "generated", videoUrl }
        : chunk
      ))
      setGenerateFeedback("Fragmento generado correctamente")
      generatingChunkId.current = null
    } else if (videoPhase === "error") {
      setChunks((current) => current.map((chunk) => chunk.id === chunkId
        ? { ...chunk, status: "error", videoUrl: undefined }
        : chunk
      ))
      setGenerateFeedback(videoError || "No se pudo generar el fragmento")
      generatingChunkId.current = null
    }
  }, [videoError, videoPhase, videoUrl])

  const recommendStrategy = () => {
    const recommendation = style === "ugc" || style === "lifestyle"
      ? { angle: "social", hook: "question", style }
      : style === "b2b"
        ? { angle: "benefit", hook: "problem", style }
        : style === "commercial"
          ? { angle: "offer", hook: "instant", style }
          : { angle: "demo", hook: "result", style }
    setAngle(recommendation.angle); setHook(recommendation.hook); setStyle(recommendation.style)
    const nextAngle = VIDEO_ANGLES.find((item) => item.id === recommendation.angle)?.label
    const nextHook = VIDEO_HOOKS.find((item) => item.id === recommendation.hook)?.label
    setStrategyFeedback(`${nextHook} · ${nextAngle}`)
  }

  const generateVideoChunk = () => {
    if (!canGenerate || !activePreviewUrl) return
    const chunkId = activeChunk.id
    const apiAngle = VIDEO_ANGLE_API_MAP[angle]
    const apiStyle = VIDEO_STYLE_API_MAP[style]
    if (!apiAngle || !apiStyle) return

    generatingChunkId.current = chunkId
    setChunks((current) => current.map((chunk) => chunk.id === chunkId ? { ...chunk, status: "generating" } : chunk))
    setGenerateFeedback("Generando fragmento...")
    void generateVideo(activePreviewUrl, apiAngle, hookLabel ?? hook, apiStyle)
  }

  const mergeVideoChunks = () => {
    if (generatedChunks.length < 2) return
    // TODO: conectar aquí el endpoint productivo de unión de fragmentos.
  }

  const editChunk = (id: number) => {
    selectChunk(id)
    setActiveTab("action")
    setWorkspaceMode("advanced")
  }

  return <div id="video-workspace" data-pixel-ai-open={pixelAiOpen ? "true" : "false"} data-workspace-mode={workspaceMode} className={s.page}>
    <EditorHeader tool="video" action={<button
      type="button"
      className={`${s.pixelAiHeaderButton} ${pixelAiOpen ? s.pixelAiHeaderButtonActive : ""}`}
      onClick={() => setPixelAiOpen((open) => !open)}
      aria-controls="pixel-ai-panel"
      aria-expanded={pixelAiOpen}
    ><Sparkles /><span>PixelIA</span><i>{pixelAiOpen ? "Abierto" : "Asistente creativo"}</i></button>} />
    <section className={s.workspace}>
    {workspaceMode === "storyboard" ? <VideoStoryboard
      chunks={chunks}
      angleLabel={angleLabel}
      hookLabel={hookLabel}
      styleLabel={styleLabel}
      sourceReady={Boolean(activeSource === "upload" && activePreviewUrl?.startsWith("https://"))}
      canGenerate={canGenerate}
      generateFeedback={generateFeedback}
      activeId={activeId}
      onAdjust={() => setWorkspaceMode("advanced")}
      onGenerate={generateVideoChunk}
      onSelect={selectChunk}
      onEdit={editChunk}
      onAdd={addChunk}
      onRemove={removeChunk}
      onMove={moveChunk}
    /> : <>
    <aside className={s.configPanel}>
      <header className={s.intro}><button type="button" className={s.advancedBack} onClick={() => setWorkspaceMode("storyboard")}><ArrowLeft />Volver al storyboard</button><span>AJUSTAR ESCENAS</span><h1>Dirige tu anuncio</h1><p>Define qué vemos, qué ocurre y cómo se ejecuta cada escena.</p></header>
      <section className={s.globalStrategyEditor} aria-label="Estrategia global del anuncio">
        <header><div><span>GLOBAL</span><b>Estrategia del anuncio</b></div><small>Decisiones creativas que se aplican a todas las escenas</small></header>
        <div>
          <label><span className={s.strategyControlHeader}><i><Compass /></i>Hipótesis / ángulo</span><span className={s.strategySelectWrap}><select value={angle} onChange={(event) => setAngle(event.target.value)}>{VIDEO_ANGLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown /></span></label>
          <label><span className={s.strategyControlHeader}><i><Zap /></i>Hook principal</span><span className={s.strategySelectWrap}><select value={hook} onChange={(event) => setHook(event.target.value)}>{VIDEO_HOOKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown /></span></label>
          <label><span className={s.strategyControlHeader}><i><Palette /></i>Estilo general</span><span className={s.strategySelectWrap}><select value={style} onChange={(event) => setStyle(event.target.value)}>{VIDEO_STYLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown /></span></label>
        </div>
      </section>
      <div className={s.configBody}>
        <nav className={s.stepTabs} aria-label="Configuración del video">
          {VIDEO_TABS.map((tab) => <button type="button" key={tab.id} className={activeTab === tab.id ? s.stepActive : ""} aria-current={activeTab === tab.id ? "step" : undefined} onClick={() => setActiveTab(tab.id)}><span>{tab.step}</span>{tab.label}</button>)}
        </nav>
        <div className={s.configScroll}>
          {activeTab === "reference" && <section className={s.card}>
            <SectionTitle step="01" title="Referencia visual" description="Define qué imagen, producto, persona o referencia usa esta escena." />
            <VideoSourcePicker source={activeSource} previewUrl={activePreviewUrl} fileName={activeFileName} fileError={fileError} onSourceChange={(referenceSource) => updateActiveChunk({ referenceSource })} onUpload={handleUpload} onClear={clearPreview} />
            <VideoSceneField id={`scene-reference-${activeChunk.id}`} label="Qué debemos reconocer" value={activeChunk.referenceDescription ?? ""} onChange={(referenceDescription) => updateActiveChunk({ referenceDescription })} suggestions={REFERENCE_SUGGESTIONS} placeholder="Ej. El producto en manos de una persona, con el empaque visible y una cocina luminosa de fondo." helper="Complementa la imagen con el sujeto o detalle que debe mantenerse visible." maxLength={300} />
          </section>}
          {activeTab === "action" && <section className={s.card}>
            <SectionTitle step="02" title="Acción" description="Define qué ocurre físicamente en esta escena." />
            <VideoSceneField id={`scene-action-${activeChunk.id}`} label="Qué ocurre" value={activeChunk.action ?? activeChunk.sceneDirection ?? ""} onChange={(action) => updateActiveChunk({ action, sceneDirection: action })} suggestions={ACTION_SUGGESTIONS} placeholder="Ej. Una persona abre la caja, extrae el producto y lo muestra a cámara con un gesto natural." helper="Describe una acción concreta y observable." maxLength={500} />
          </section>}
          {activeTab === "camera" && <section className={s.card}>
            <SectionTitle step="03" title="Cámara" description="Define cómo se encuadra y graba la acción." />
            <VideoSceneField id={`scene-camera-${activeChunk.id}`} label="Encuadre y movimiento" value={activeChunk.camera ?? ""} onChange={(camera) => updateActiveChunk({ camera })} suggestions={CAMERA_SUGGESTIONS} placeholder="Ej. Plano medio handheld que se acerca lentamente hasta un close-up del producto." helper="Combina plano, movimiento y punto de vista si lo necesitas." maxLength={350} />
          </section>}
          {activeTab === "dialogue" && <section className={s.card}>
            <SectionTitle step="04" title="Diálogo / texto" description="Añade voz, diálogo o texto visible solo si esta escena lo necesita." />
            <VideoSceneField id={`scene-dialogue-${activeChunk.id}`} label="Qué se dice o aparece escrito" value={activeChunk.dialogue ?? ""} onChange={(dialogue) => updateActiveChunk({ dialogue })} suggestions={DIALOGUE_SUGGESTIONS} placeholder={'Ej. Voz en off: "Así simplifiqué mi rutina cada mañana". Texto en pantalla: "Listo en segundos".'} helper="Puedes dejarlo vacío para una escena completamente visual." optional maxLength={500} />
          </section>}
          {activeTab === "sceneStyle" && <section className={s.card}>
            <SectionTitle step="05" title="Estilo de escena" description="Define el matiz visual local sin cambiar el estilo global del anuncio." />
            <VideoSceneField id={`scene-style-${activeChunk.id}`} label="Estética local" value={activeChunk.sceneStyle ?? ""} onChange={(sceneStyle) => updateActiveChunk({ sceneStyle })} suggestions={SCENE_STYLE_SUGGESTIONS} placeholder="Ej. UGC natural, luz suave de ventana y energía cercana." helper="Este matiz complementa el estilo general; no redefine el branding." maxLength={350} />
          </section>}
        </div>
      </div>
      <footer className={s.generateDock}><button disabled={!canGenerate} onClick={generateVideoChunk}><WandSparkles />Generar video</button><small>{generateFeedback || (canGenerate ? "Configuración completa · Lista para generar" : "Selecciona una fuente visual para continuar")}</small></footer>
    </aside>
    <main className={s.stagePanel}>
      <VideoPreview previewUrl={activeSource === "upload" ? activePreviewUrl : null} activeChunk={activeChunk} activeIndex={activeIndex} totalDuration={chunks.length * 6} hookLabel={hookLabel} angleLabel={angleLabel} styleLabel={styleLabel} strategyFeedback={strategyFeedback} onRecommend={recommendStrategy} />
      <VideoTimeline chunks={chunks} activeId={activeId} hookLabel={hookLabel} styleLabel={styleLabel} finalVideoUrl={finalVideoUrl} onSelect={selectChunk} onAdd={addChunk} onRemove={removeChunk} onMove={moveChunk} onMerge={mergeVideoChunks} />
    </main>
    </>}
    <PixelAiDrawer open={pixelAiOpen} onOpenChange={setPixelAiOpen} focusMode />
    </section>
  </div>
}
