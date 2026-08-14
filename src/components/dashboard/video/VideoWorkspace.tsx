"use client"

import { useEffect, useRef, useState } from "react"
import { WandSparkles } from "lucide-react"
import { useVideoGenerator } from "@/hooks/useVideoGenerator"
import { supabase } from "@/lib/supabase"
import VideoOptionGrid from "./VideoOptionGrid"
import VideoPreview from "./VideoPreview"
import VideoSourcePicker from "./VideoSourcePicker"
import VideoTimeline from "./VideoTimeline"
import { CHUNK_PURPOSES, VIDEO_ANGLES, VIDEO_HOOKS, VIDEO_STYLES, type VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

type VideoTab = "source" | "angle" | "hook" | "style"

const VIDEO_TABS: { id: VideoTab; step: string; label: string }[] = [
  { id: "source", step: "01", label: "Fuente visual" },
  { id: "angle", step: "02", label: "Ángulo" },
  { id: "hook", step: "03", label: "Gancho" },
  { id: "style", step: "04", label: "Estilo" },
]

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

export default function VideoWorkspace() {
  const nextId = useRef(2)
  const generatingChunkId = useRef<number | null>(null)
  const { videoUrl, videoPhase, videoError, generateVideo } = useVideoGenerator()
  const [source, setSource] = useState<"library" | "upload">("library")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [fileError, setFileError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [angle, setAngle] = useState("demo")
  const [hook, setHook] = useState("result")
  const [style, setStyle] = useState("cinematic")
  const [activeTab, setActiveTab] = useState<VideoTab>("source")
  const [chunks, setChunks] = useState<VideoChunk[]>([{ id: 1, purpose: CHUNK_PURPOSES[0], duration: 6, status: "pending" }])
  const [activeId, setActiveId] = useState(1)
  const [strategyFeedback, setStrategyFeedback] = useState("")
  const [generateFeedback, setGenerateFeedback] = useState("")
  const [finalVideoUrl] = useState<string | null>(null)

  const clearPreview = () => { setPreviewUrl(null); setFileName(""); setFileError(""); setGenerateFeedback("") }
  const handleUpload = async (file?: File) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setFileError("Usa una imagen JPG, PNG o WEBP."); return }
    if (file.size > 5 * 1024 * 1024) { setFileError("La imagen debe pesar menos de 5 MB."); return }

    clearPreview(); setFileName(file.name); setSource("upload"); setUploading(true); setGenerateFeedback("Subiendo fuente visual...")
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

      setPreviewUrl(data.publicUrl)
      setFileName(file.name)
      setGenerateFeedback("Fuente visual lista para generar")
    } catch (error) {
      setPreviewUrl(null)
      setFileError(error instanceof Error ? error.message : "No se pudo subir la fuente visual")
      setGenerateFeedback("")
    } finally {
      setUploading(false)
    }
  }
  const addChunk = () => { if (chunks.length >= 5) return; const chunk: VideoChunk = { id: nextId.current++, purpose: CHUNK_PURPOSES[chunks.length], duration: 6, status: source === "upload" && previewUrl ? "configured" : "pending" }; setChunks([...chunks, chunk]); setActiveId(chunk.id) }
  const removeChunk = (id: number) => { if (chunks.length === 1) return; const removedIndex = chunks.findIndex((chunk) => chunk.id === id); const next = chunks.filter((chunk) => chunk.id !== id); setChunks(next); if (activeId === id) setActiveId(next[Math.min(removedIndex, next.length - 1)].id) }
  const moveChunk = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= chunks.length) return; const next = [...chunks]; [next[index], next[target]] = [next[target], next[index]]; setChunks(next) }

  const activeChunk = chunks.find((chunk) => chunk.id === activeId) ?? chunks[0]
  const activeIndex = chunks.findIndex((chunk) => chunk.id === activeId)
  const angleLabel = VIDEO_ANGLES.find((item) => item.id === angle)?.label
  const hookLabel = VIDEO_HOOKS.find((item) => item.id === hook)?.label
  const styleLabel = VIDEO_STYLES.find((item) => item.id === style)?.label
  const canGenerate = Boolean(source === "upload" && previewUrl?.startsWith("https://") && angle && hook && style && activeChunk && !uploading && videoPhase !== "generating")
  const generatedChunks = chunks.filter((chunk) => chunk.status === "generated" && chunk.videoUrl)

  useEffect(() => {
    setChunks((current) => current.map((chunk) => (
      ["generating", "generated", "error"].includes(chunk.status)
        ? chunk
        : { ...chunk, status: canGenerate ? "configured" : "pending" }
    )))
  }, [canGenerate])

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
    if (!canGenerate || !previewUrl) return
    const chunkId = activeChunk.id
    const apiAngle = VIDEO_ANGLE_API_MAP[angle]
    const apiStyle = VIDEO_STYLE_API_MAP[style]
    if (!apiAngle || !apiStyle) return

    generatingChunkId.current = chunkId
    setChunks((current) => current.map((chunk) => chunk.id === chunkId ? { ...chunk, status: "generating" } : chunk))
    setGenerateFeedback("Generando fragmento...")
    void generateVideo(previewUrl, apiAngle, hookLabel ?? hook, apiStyle)
  }

  const mergeVideoChunks = () => {
    if (generatedChunks.length < 2) return
    // TODO: conectar aquí el endpoint productivo de unión de fragmentos.
  }

  return <div className={s.page}><section className={s.workspace}>
    <aside className={s.configPanel}>
      <header className={s.intro}><span>NUEVO VIDEO</span><h1>Dirige tu anuncio</h1><p>Construye una secuencia pensada para detener el scroll.</p></header>
      <nav className={s.stepTabs} aria-label="Configuración del video">
        {VIDEO_TABS.map((tab) => <button key={tab.id} className={activeTab === tab.id ? s.stepActive : ""} onClick={() => setActiveTab(tab.id)}><span>{tab.step}</span>{tab.label}</button>)}
      </nav>
      <div className={s.configScroll}>
        {activeTab === "source" && <section className={s.card}><SectionTitle step="01" title="Fuente visual" description="Elige la imagen que dará vida al video." /><VideoSourcePicker source={source} previewUrl={previewUrl} fileName={fileName} fileError={fileError} onSourceChange={setSource} onUpload={handleUpload} onClear={clearPreview} /></section>}
        {activeTab === "angle" && <section className={s.card}><SectionTitle step="02" title="Ángulo" description="Define la idea persuasiva de la secuencia." /><VideoOptionGrid options={VIDEO_ANGLES} selected={angle} onSelect={setAngle} /></section>}
        {activeTab === "hook" && <section className={s.card}><SectionTitle step="03" title="Gancho" description="Decide cómo ganar el primer segundo." /><VideoOptionGrid options={VIDEO_HOOKS} selected={hook} onSelect={setHook} /></section>}
        {activeTab === "style" && <section className={s.card}><SectionTitle step="04" title="Estilo de video" description="Marca el lenguaje visual y el ritmo." /><VideoOptionGrid options={VIDEO_STYLES} selected={style} onSelect={setStyle} /></section>}
      </div>
      <footer className={s.generateDock}><button disabled={!canGenerate} onClick={generateVideoChunk}><WandSparkles />Generar video</button><small>{generateFeedback || (canGenerate ? "Configuración completa · Lista para generar" : "Selecciona una fuente visual para continuar")}</small></footer>
    </aside>
    <main className={s.stagePanel}>
      <VideoPreview previewUrl={source === "upload" ? previewUrl : null} activeChunk={activeChunk} activeIndex={activeIndex} totalDuration={chunks.length * 6} hookLabel={hookLabel} angleLabel={angleLabel} styleLabel={styleLabel} strategyFeedback={strategyFeedback} onRecommend={recommendStrategy} />
      <VideoTimeline chunks={chunks} activeId={activeId} hookLabel={hookLabel} finalVideoUrl={finalVideoUrl} onSelect={setActiveId} onAdd={addChunk} onRemove={removeChunk} onMove={moveChunk} onMerge={mergeVideoChunks} />
    </main>
  </section></div>
}
