"use client"

import { useEffect, useState } from "react"
import { Download, Film, Link2, RotateCcw } from "lucide-react"
import type { VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

export default function VideoPreview(props: {
  previewUrl: string | null; activeChunk: VideoChunk; activeIndex: number; totalDuration: number; chunks: VideoChunk[]
  pendingChanges: ReadonlySet<number>; finalVideoUrl: string | null; finalVideoSceneSignature?: string | null
  hookLabel?: string; angleLabel?: string; styleLabel?: string; strategyFeedback: string; onRecommend: () => void
  hasPendingChanges: boolean; canRegenerate: boolean; onRegenerate: () => void
}) {
  const { previewUrl, activeChunk, activeIndex, totalDuration, chunks, pendingChanges, finalVideoUrl, styleLabel, hasPendingChanges, canRegenerate, onRegenerate } = props
  const [view, setView] = useState<"scene" | "complete">("scene")
  const showComplete = view === "complete" && chunks.length > 1
  const readyCount = chunks.filter((chunk) => chunk.status === "generated" && chunk.videoUrl?.startsWith("https://") && !pendingChanges.has(chunk.id)).length
  const allReady = readyCount === chunks.length && pendingChanges.size === 0
  const validFinalVideoUrl = finalVideoUrl?.startsWith("https://") ? finalVideoUrl : null
  // The future assembly flow can save this snapshot alongside finalVideoUrl to detect regenerated scenes.
  const currentSceneSignature = JSON.stringify(chunks.map((chunk) => [chunk.id, chunk.videoUrl, chunk.generatedSceneSignature]))
  const finalVideoOutdated = Boolean(validFinalVideoUrl && (!allReady || (props.finalVideoSceneSignature !== undefined && props.finalVideoSceneSignature !== currentSceneSignature)))

  useEffect(() => { if (chunks.length < 2) setView("scene") }, [chunks.length])

  return <>
    <header className={s.stageHeader}>
      <div><span className={s.liveDot} /><span><b>Vista previa</b><small>{showComplete ? `Anuncio completo · ${chunks.length} escenas` : `Escena ${activeIndex + 1} · ${activeChunk.purpose}`}</small></span></div>
      <div className={s.previewHeaderActions}>
        {chunks.length > 1 && <div className={s.previewViewSwitch} role="group" aria-label="Contenido de la vista previa">
          <button type="button" aria-pressed={!showComplete} className={!showComplete ? s.previewViewActive : ""} onClick={() => setView("scene")}>Escena</button>
          <button type="button" aria-pressed={showComplete} className={showComplete ? s.previewViewActive : ""} onClick={() => setView("complete")}>Anuncio completo</button>
        </div>}
        {!showComplete && activeChunk.videoUrl && <a className={s.downloadChunk} href={activeChunk.videoUrl} download><Download />Descargar escena</a>}
        <div className={s.duration}><small>Duración estimada</small><b>{totalDuration}s</b></div>
      </div>
    </header>
    {!showComplete && hasPendingChanges && activeChunk.status !== "generating" && <div className={s.previewPendingNotice} role="status">
      <span><b>Cambios pendientes</b><small>Este video corresponde a la versión anterior de la escena.</small></span>
      <button type="button" disabled={!canRegenerate} onClick={onRegenerate}><RotateCcw />Regenerar escena</button>
    </div>}
    {showComplete ? <div className={s.previewStage}>
      <div className={`${s.completePreview} ${validFinalVideoUrl ? s.completePreviewWithVideo : ""}`} role="status">
        {validFinalVideoUrl ? <video src={validFinalVideoUrl} controls playsInline aria-label="Anuncio completo" /> : <div className={s.completePreviewIcon}><Film aria-hidden="true" /></div>}
        <div className={s.completePreviewBody}>
          <span className={s.completePreviewEyebrow}>ANUNCIO COMPLETO</span>
          <h2>{validFinalVideoUrl ? finalVideoOutdated ? "Anuncio desactualizado" : "Tu anuncio está listo" : allReady ? "Listo para unir" : pendingChanges.size > 0 ? "Hay cambios pendientes" : "Prepara todas las escenas"}</h2>
          <p>{readyCount} de {chunks.length} escenas listas · {totalDuration} s</p>
          {validFinalVideoUrl ? <>
            {finalVideoOutdated && <small>Hay escenas nuevas o con cambios pendientes. El anuncio unido corresponde a una versión anterior.</small>}
            {!finalVideoOutdated && <a className={s.completePreviewAction} href={validFinalVideoUrl} download><Download />Descargar anuncio</a>}
          </> : <>
            {pendingChanges.size > 0 ? <small>Actualiza las escenas con cambios pendientes antes de unir el anuncio.</small> : !allReady ? <small>Consulta la secuencia de abajo para ver cuáles faltan.</small> : <small>Todos los clips están vigentes.</small>}
            <button type="button" className={s.completePreviewAction} disabled><Link2 />Unir anuncio</button>
            <small>Disponible al conectar el ensamblado final.</small>
          </>}
        </div>
      </div>
    </div> : <div className={s.previewStage}>
      <div className={s.phoneFrame}>
        {activeChunk.videoUrl ? <video key={`${activeChunk.id}-${activeChunk.videoUrl}`} src={activeChunk.videoUrl} controls playsInline /> : previewUrl ? <img src={previewUrl} alt="Preview de la escena activa" /> : <div className={s.previewEmpty}><Film /><p>Selecciona una imagen para preparar esta escena.</p></div>}
        {(activeChunk.status === "generating" || activeChunk.status === "error" || !activeChunk.videoUrl) && <div className={s.previewOverlay} role={activeChunk.status === "error" ? "alert" : "status"}>
          <span>ESCENA {activeIndex + 1}</span>
          <b>{activeChunk.status === "generating" ? "Generando esta escena…" : activeChunk.status === "error" ? "No se pudo generar esta escena" : activeChunk.purpose}</b>
          <small>{activeChunk.status === "generating" ? "El video aparecerá aquí cuando esté listo." : activeChunk.status === "error" ? "Revisa la escena e inténtalo de nuevo." : `${activeChunk.duration} segundos · ${activeChunk.sceneStyle.trim() || styleLabel}`}</small>
        </div>}
      </div>
    </div>}
  </>
}
