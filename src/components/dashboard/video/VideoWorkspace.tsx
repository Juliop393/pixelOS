"use client"

import { useEffect, useRef, useState } from "react"
import { WandSparkles } from "lucide-react"
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

function SectionTitle({ step, title, description }: { step: string; title: string; description: string }) {
  return <div className={s.cardTitle}><i>{step}</i><div><h2>{title}</h2><p>{description}</p></div></div>
}

export default function VideoWorkspace() {
  const nextId = useRef(2)
  const [source, setSource] = useState<"library" | "upload">("library")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [angle, setAngle] = useState("demo")
  const [hook, setHook] = useState("result")
  const [style, setStyle] = useState("cinematic")
  const [activeTab, setActiveTab] = useState<VideoTab>("source")
  const [chunks, setChunks] = useState<VideoChunk[]>([{ id: 1, purpose: CHUNK_PURPOSES[0], duration: 6 }])
  const [activeId, setActiveId] = useState(1)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const clearPreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setFileName("") }
  const handleUpload = (file?: File) => { if (!file) return; clearPreview(); setPreviewUrl(URL.createObjectURL(file)); setFileName(file.name); setSource("upload") }
  const addChunk = () => { if (chunks.length >= 5) return; const chunk: VideoChunk = { id: nextId.current++, purpose: CHUNK_PURPOSES[chunks.length], duration: 6 }; setChunks([...chunks, chunk]); setActiveId(chunk.id) }
  const removeChunk = (id: number) => { if (chunks.length === 1) return; const next = chunks.filter((chunk) => chunk.id !== id); setChunks(next); if (activeId === id) setActiveId(next[0].id) }
  const moveChunk = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= chunks.length) return; const next = [...chunks]; [next[index], next[target]] = [next[target], next[index]]; setChunks(next) }

  const activeChunk = chunks.find((chunk) => chunk.id === activeId) ?? chunks[0]
  const activeIndex = chunks.findIndex((chunk) => chunk.id === activeId)
  const angleLabel = VIDEO_ANGLES.find((item) => item.id === angle)?.label
  const hookLabel = VIDEO_HOOKS.find((item) => item.id === hook)?.label
  const styleLabel = VIDEO_STYLES.find((item) => item.id === style)?.label

  return <div className={s.page}><section className={s.workspace}>
    <aside className={s.configPanel}>
      <header className={s.intro}><span>NUEVO VIDEO</span><h1>Dirige tu anuncio</h1><p>Construye una secuencia pensada para detener el scroll.</p></header>
      <nav className={s.stepTabs} aria-label="Configuración del video">
        {VIDEO_TABS.map((tab) => <button key={tab.id} className={activeTab === tab.id ? s.stepActive : ""} onClick={() => setActiveTab(tab.id)}><span>{tab.step}</span>{tab.label}</button>)}
      </nav>
      <div className={s.configScroll}>
        {activeTab === "source" && <section className={s.card}><SectionTitle step="01" title="Fuente visual" description="Elige la imagen que dará vida al video." /><VideoSourcePicker source={source} previewUrl={previewUrl} fileName={fileName} onSourceChange={setSource} onUpload={handleUpload} onClear={clearPreview} /></section>}
        {activeTab === "angle" && <section className={s.card}><SectionTitle step="02" title="Ángulo" description="Define la idea persuasiva de la secuencia." /><VideoOptionGrid options={VIDEO_ANGLES} selected={angle} onSelect={setAngle} /></section>}
        {activeTab === "hook" && <section className={s.card}><SectionTitle step="03" title="Gancho" description="Decide cómo ganar el primer segundo." /><VideoOptionGrid options={VIDEO_HOOKS} selected={hook} onSelect={setHook} /></section>}
        {activeTab === "style" && <section className={s.card}><SectionTitle step="04" title="Estilo de video" description="Marca el lenguaje visual y el ritmo." /><VideoOptionGrid options={VIDEO_STYLES} selected={style} onSelect={setStyle} /></section>}
      </div>
      <footer className={s.generateDock}><button disabled><WandSparkles />Generar video <span>Próximamente</span></button><small>Integración en preparación · No consume créditos</small></footer>
    </aside>
    <main className={s.stagePanel}>
      <VideoPreview previewUrl={previewUrl} activeChunk={activeChunk} activeIndex={activeIndex} totalDuration={chunks.length * 6} hookLabel={hookLabel} angleLabel={angleLabel} styleLabel={styleLabel} />
      <VideoTimeline chunks={chunks} activeId={activeId} hookLabel={hookLabel} onSelect={setActiveId} onAdd={addChunk} onRemove={removeChunk} onMove={moveChunk} />
    </main>
  </section></div>
}
