"use client"

import { ArrowLeft, ArrowRight, Clapperboard, Clock3, PencilLine, Plus, SlidersHorizontal, Trash2, WandSparkles } from "lucide-react"
import type { ReactNode } from "react"
import { getSceneDescription, getVideoDuration, VIDEO_GENERATION_DURATION, VIDEO_MAX_SCENES, type VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

const STATUS_LABELS: Record<VideoChunk["status"], string> = {
  pending: "Pendiente",
  configured: "Lista",
  generating: "Generando",
  generated: "Generada",
  error: "Revisar",
}

type VideoStoryboardProps = {
  chunks: VideoChunk[]
  strategyEditor: ReactNode
  sourceReady: boolean
  canGenerate: boolean
  generateFeedback: string
  activeId: number
  onAdjust: () => void
  onGenerate: () => void
  onSelect: (id: number) => void
  onEdit: (id: number) => void
  onAdd: () => void
  onRemove: (id: number) => void
  onMove: (index: number, direction: -1 | 1) => void
}

export default function VideoStoryboard({
  chunks,
  strategyEditor,
  sourceReady,
  canGenerate,
  generateFeedback,
  activeId,
  onAdjust,
  onGenerate,
  onSelect,
  onEdit,
  onAdd,
  onRemove,
  onMove,
}: VideoStoryboardProps) {
  const totalDuration = getVideoDuration(chunks)

  return <main className={s.storyboardOverview}>
    <div className={s.storyboardInner}>
      <header className={s.storyboardHero}>
        <div className={s.storyboardHeroCopy}>
          <span>MODO PRO · SECUENCIA</span>
          <h1>Tu anuncio, escena por escena.</h1>
          <p>Define una estrategia, construye la secuencia y controla la ejecución visual de cada escena.</p>
        </div>
        <div className={s.storyboardActions}>
          <div className={s.storyboardDuration}><Clock3 /><span>Duración estimada</span><b>{totalDuration}s</b></div>
          <button type="button" className={s.storyboardGenerate} disabled={!canGenerate} onClick={onGenerate}><WandSparkles />Generar video</button>
          <button type="button" className={s.storyboardAdjust} onClick={onAdjust}><SlidersHorizontal />Ajustar escenas</button>
          <small>{generateFeedback || (sourceReady ? "Se generará la escena seleccionada" : "Añade una fuente visual a la escena seleccionada")}</small>
        </div>
      </header>

      {strategyEditor}

      <section className={s.storyboardSection}>
        <header>
          <div><span>ESCENAS</span><h2>Secuencia del anuncio</h2></div>
          <p><Clapperboard />{chunks.length} {chunks.length === 1 ? "escena" : "escenas"} · {totalDuration} segundos</p>
        </header>
        <div className={s.storyboardTrack}>
          {chunks.map((chunk, index) => <article key={chunk.id} className={`${s.storyboardScene} ${activeId === chunk.id ? s.storyboardSceneActive : ""}`} data-status={chunk.status}>
            <button type="button" className={s.storyboardSceneSelect} aria-pressed={activeId === chunk.id} onClick={() => onSelect(chunk.id)}>
              <div className={s.storyboardSceneMeta}><span>{String(index + 1).padStart(2, "0")}</span><b>{chunk.duration}s</b></div>
              <h3>{chunk.purpose}</h3>
              <p>{getSceneDescription(chunk)}</p>
              <footer><i />{STATUS_LABELS[chunk.status]}</footer>
            </button>
            <div className={s.storyboardSceneActions}>
              <button type="button" className={s.storyboardEditScene} onClick={() => onEdit(chunk.id)}><PencilLine />Editar</button>
              <span>
                <button type="button" className={s.storyboardMovePrevious} disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Mover escena hacia el inicio"><ArrowLeft /></button>
                <button type="button" className={s.storyboardMoveNext} disabled={index === chunks.length - 1} onClick={() => onMove(index, 1)} aria-label="Mover escena hacia el final"><ArrowRight /></button>
                <button type="button" disabled={chunks.length === 1} onClick={() => onRemove(chunk.id)} aria-label="Eliminar escena"><Trash2 /></button>
              </span>
            </div>
          </article>)}
          <button type="button" className={s.storyboardAddScene} disabled={chunks.length >= VIDEO_MAX_SCENES} onClick={onAdd}>
            <i><Plus /></i><b>+ Añadir escena</b><small>{chunks.length >= VIDEO_MAX_SCENES ? `Máximo actual de ${VIDEO_MAX_SCENES} escenas alcanzado` : `Nueva escena · ${VIDEO_GENERATION_DURATION} segundos disponibles`}</small>
          </button>
        </div>
      </section>

      <footer className={s.storyboardLegend}>
        <span>Global: hipótesis, hook, CTA, estilo y formato.</span>
        <span>Por escena: referencia, acción, cámara, diálogo y estilo local.</span>
      </footer>
    </div>
  </main>
}
