"use client"

import { ArrowLeft, ArrowRight, Clapperboard, Clock3, PencilLine, Plus, RotateCcw, SlidersHorizontal, Trash2, WandSparkles } from "lucide-react"
import type { ReactNode } from "react"
import { getSceneDescription, getVideoDuration, isVideoChunkReady, VIDEO_GENERATION_DURATION, VIDEO_MAX_SCENES, type VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

const STATUS_LABELS: Record<VideoChunk["status"], string> = {
  pending: "Sin generar",
  configured: "Sin generar",
  generating: "Generando",
  generated: "Lista",
  error: "Error",
}

type VideoStoryboardProps = {
  chunks: VideoChunk[]
  pendingChanges: ReadonlySet<number>
  strategyEditor: ReactNode
  sourceReady: boolean
  canGenerate: boolean
  canGenerateAnnouncement: boolean
  announcementProgress: { phase: "running" | "error" | "done"; total: number; completed: number; current: number; error?: string } | null
  generateFeedback: string
  activeId: number
  onAdjust: () => void
  onGenerate: () => void
  onGenerateAnnouncement: () => void
  canMerge: boolean
  isMerging: boolean
  mergeError: string
  finalVideoUrl: string | null
  onMerge: () => void
  onReviewComplete: () => void
  onSelect: (id: number) => void
  onEdit: (id: number) => void
  onAdd: () => void
  onAddFromLibrary: () => void
  onRemove: (id: number) => void
  onMove: (index: number, direction: -1 | 1) => void
}

export default function VideoStoryboard({
  chunks,
  pendingChanges,
  strategyEditor,
  sourceReady,
  canGenerate,
  canGenerateAnnouncement,
  announcementProgress,
  generateFeedback,
  activeId,
  onAdjust,
  onGenerate,
  onGenerateAnnouncement,
  canMerge,
  isMerging,
  mergeError,
  finalVideoUrl,
  onMerge,
  onReviewComplete,
  onSelect,
  onEdit,
  onAdd,
  onAddFromLibrary,
  onRemove,
  onMove,
}: VideoStoryboardProps) {
  const totalDuration = getVideoDuration(chunks)
  const selectedChunk = chunks.find((chunk) => chunk.id === activeId)
  const anotherSceneGenerating = chunks.some((chunk) => chunk.id !== activeId && chunk.status === "generating")
  const readyCount = chunks.filter(isVideoChunkReady).length
  const changedCount = chunks.filter((chunk) => pendingChanges.has(chunk.id) && chunk.status !== "generating").length
  const generatingCount = chunks.filter((chunk) => chunk.status === "generating").length
  const errorCount = chunks.filter((chunk) => chunk.status === "error" && !pendingChanges.has(chunk.id)).length
  const pendingCount = chunks.length - readyCount - changedCount - generatingCount - errorCount
  const scenesToGenerate = chunks.some((chunk) => chunk.videoSource !== "library" && !isVideoChunkReady(chunk))

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
          {selectedChunk && <><button type="button" className={`${s.storyboardGenerate} ${selectedChunk.videoUrl ? s.storyboardRegenerate : ""}`} disabled={!canGenerate} onClick={onGenerate}>{selectedChunk.videoSource === "library" ? <Clapperboard /> : selectedChunk.videoUrl ? <RotateCcw /> : <WandSparkles />}{selectedChunk.videoSource === "library" ? "Clip de biblioteca" : selectedChunk.videoUrl ? "Regenerar escena" : "Generar escena"}</button>
          <button type="button" className={s.storyboardAdjust} onClick={onAdjust}><SlidersHorizontal />Ajustar escenas</button>
          <small><strong>{selectedChunk.videoSource === "library" ? "Video existente · sin nuevo cobro" : "12 créditos por escena de 6 s"}</strong><br />{selectedChunk.videoSource === "library" ? "Este clip fijo ya está listo para unir." : selectedChunk.status === "generating" ? "Generando esta escena…" : anotherSceneGenerating ? "Otra escena se está generando; puedes seguir editando." : generateFeedback || (sourceReady ? selectedChunk.videoUrl ? "Solo se regenerará la escena seleccionada" : "Se generará la escena seleccionada" : "Añade una fuente visual a la escena seleccionada")}</small></>}
        </div>
      </header>

      {strategyEditor}

      <section className={s.storyboardSection}>
        <header>
          <div><span>ESCENAS</span><h2>Secuencia del anuncio</h2></div>
          <div className={s.storyboardSectionActions}>
            <p><Clapperboard />{chunks.length} {chunks.length === 1 ? "escena" : "escenas"} · {readyCount} listas{changedCount > 0 ? ` · ${changedCount} con cambios pendientes` : ""} · {generatingCount} generando · {pendingCount} sin generar{errorCount > 0 ? ` · ${errorCount} error` : ""}</p>
            {(scenesToGenerate || announcementProgress?.phase === "running") && <button type="button" disabled={!canGenerateAnnouncement} onClick={onGenerateAnnouncement}><WandSparkles />Generar anuncio</button>}
            {chunks.length >= 2 && (finalVideoUrl
              ? <button type="button" onClick={onReviewComplete}><Clapperboard />Anuncio completo</button>
              : <button type="button" disabled={!canMerge} onClick={onMerge}><Clapperboard />{isMerging ? "Uniendo..." : "Unir anuncio"}</button>)}
          </div>
        </header>
        {announcementProgress?.phase === "running" && <p className={s.storyboardBatchProgress} role="status">Generando anuncio · {announcementProgress.current} de {announcementProgress.total} escenas · {announcementProgress.completed} listas en esta tanda</p>}
        {announcementProgress?.phase === "error" && <p className={s.storyboardBatchError} role="alert">{announcementProgress.error} Los clips listos se conservaron. Puedes reintentar la escena o volver a generar el anuncio.</p>}
        {mergeError && <p className={s.storyboardBatchError} role="alert">{mergeError}</p>}
        <div className={s.storyboardTrack}>
          {chunks.map((chunk, index) => <article key={chunk.id} className={`${s.storyboardScene} ${activeId === chunk.id ? s.storyboardSceneActive : ""}`} data-status={chunk.status === "generating" ? "generating" : pendingChanges.has(chunk.id) ? "changed" : chunk.status}>
            <button type="button" className={s.storyboardSceneSelect} aria-pressed={activeId === chunk.id} onClick={() => onSelect(chunk.id)}>
              <div className={s.storyboardSceneMeta}><span>{String(index + 1).padStart(2, "0")}</span><b>{chunk.duration}s</b></div>
              <h3>{chunk.purpose}</h3>
              <p>{getSceneDescription(chunk)}</p>
              <footer><i />{chunk.videoSource === "library" ? "Biblioteca · lista" : chunk.status !== "generating" && pendingChanges.has(chunk.id) ? "Cambios pendientes" : STATUS_LABELS[chunk.status]}</footer>
            </button>
            <div className={s.storyboardSceneActions}>
              <button type="button" className={s.storyboardEditScene} disabled={chunk.videoSource === "library"} onClick={() => onEdit(chunk.id)}><PencilLine />{chunk.videoSource === "library" ? "Clip fijo" : "Editar"}</button>
              <span>
                <button type="button" className={s.storyboardMovePrevious} disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Mover escena hacia el inicio"><ArrowLeft /></button>
                <button type="button" className={s.storyboardMoveNext} disabled={index === chunks.length - 1} onClick={() => onMove(index, 1)} aria-label="Mover escena hacia el final"><ArrowRight /></button>
                <button type="button" disabled={chunk.status === "generating"} onClick={() => onRemove(chunk.id)} aria-label="Eliminar escena"><Trash2 /></button>
              </span>
            </div>
          </article>)}
          <button type="button" className={s.storyboardAddScene} disabled={chunks.length >= VIDEO_MAX_SCENES} onClick={onAdd}>
            <i><Plus /></i><b>+ Añadir escena</b><small>{chunks.length >= VIDEO_MAX_SCENES ? `Máximo actual de ${VIDEO_MAX_SCENES} escenas alcanzado` : `Nueva escena · ${VIDEO_GENERATION_DURATION} segundos disponibles`}</small>
          </button>
          <button type="button" className={`${s.storyboardAddScene} ${s.storyboardAddLibrary}`} disabled={chunks.length >= VIDEO_MAX_SCENES} onClick={onAddFromLibrary}>
            <i><Clapperboard /></i><b>Añadir desde biblioteca</b><small>Video existente · sin generar de nuevo</small>
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
