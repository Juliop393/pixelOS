import { ArrowLeft, Check, Clock3, Download, Film, PencilLine, RotateCcw } from "lucide-react"
import { getSceneDescription, getVideoDuration, type VideoChunk } from "./video-data"
import s from "./VideoResult.module.css"

type SceneState = "pending" | "generating" | "ready" | "error" | "changed"

const isVideoUrl = (url?: string | null) => Boolean(url && (url.startsWith("https://") || url.startsWith("blob:")))

function getSceneState(chunk: VideoChunk, pendingChanges: ReadonlySet<number>): SceneState {
  if (chunk.status === "generating") return "generating"
  if (chunk.status === "error") return "error"
  if (pendingChanges.has(chunk.id) && isVideoUrl(chunk.videoUrl)) return "changed"
  if (chunk.status === "generated" && isVideoUrl(chunk.videoUrl)) return "ready"
  return "pending"
}

const STATE_LABELS: Record<SceneState, string> = {
  pending: "Sin generar",
  generating: "Generando",
  ready: "Lista",
  error: "Error",
  changed: "Cambios pendientes",
}

export default function VideoResult({ chunks, format, finalVideoUrl, pendingChanges, onEdit, onEditScene }: {
  chunks: VideoChunk[]
  format: string
  finalVideoUrl: string | null
  pendingChanges: ReadonlySet<number>
  onEdit: () => void
  onEditScene: (id: number) => void
}) {
  const states = chunks.map((chunk) => getSceneState(chunk, pendingChanges))
  const readyCount = states.filter((state) => state === "ready").length
  const generating = states.includes("generating")
  const hasError = states.includes("error")
  const hasChanges = states.includes("changed")
  const allReady = chunks.length > 0 && readyCount === chunks.length
  const finalUrl = isVideoUrl(finalVideoUrl) ? finalVideoUrl : null
  const singleUrl = chunks.length === 1 && isVideoUrl(chunks[0].videoUrl) ? chunks[0].videoUrl : null
  const previewUrl = finalUrl ?? singleUrl
  const downloadUrl = !hasChanges && (finalUrl ?? (allReady ? singleUrl : null))

  const title = hasError ? "Una escena necesita atención"
    : generating ? "Tu anuncio se está generando"
      : hasChanges ? "Tu anuncio tiene cambios pendientes"
        : allReady ? (previewUrl ? "Tu video está listo" : "Tus escenas están listas")
          : readyCount > 0 ? "Tu anuncio está tomando forma" : "Tu anuncio está aquí"

  const summary = allReady && !previewUrl
    ? "Todas las escenas están listas; todavía no existe un video final unido."
    : `${readyCount} de ${chunks.length} ${chunks.length === 1 ? "escena lista" : "escenas listas"}`

  const emptyMessage = chunks.length === 1
    ? "Esta escena todavía no tiene un video para reproducir."
    : allReady
      ? "Las escenas se pueden revisar abajo. La unión final aún no está disponible."
      : "El video final estará disponible cuando las escenas estén listas y exista un archivo unido."

  const downloadHelp = hasChanges
    ? "Hay cambios sin generar; el video anterior no refleja la edición actual."
    : chunks.length > 1 && !finalUrl
      ? "La descarga final estará disponible cuando exista el archivo unido."
      : "La descarga se activará cuando exista un video listo."

  return <main className={s.result} aria-labelledby="video-result-title">
    <div className={s.inner}>
      <header className={s.hero}>
        <span>VIDEO · RESULTADO</span>
        <h1 id="video-result-title">{title}</h1>
        <p>{summary}</p>
      </header>

      <div className={s.overview}>
        <section className={s.playerArea} aria-label="Video final">
          <div className={s.playerFrame}>
            {previewUrl ? <video key={previewUrl} src={previewUrl} controls playsInline preload="metadata" poster={chunks[0]?.referenceImageUrl} aria-label={chunks.length === 1 && !finalUrl ? "Video de la escena" : "Video final"} /> : <div className={s.emptyPlayer}>
              <Film aria-hidden="true" />
              <b>Video final</b>
              <p>{emptyMessage}</p>
            </div>}
          </div>
          {previewUrl && chunks.length === 1 && <p className={s.playerCaption}>{hasChanges ? "Esta es la versión anterior de la escena. Tus cambios aún no aparecen en el video." : "Video generado de la única escena del anuncio."}</p>}
          {previewUrl && chunks.length > 1 && <p className={s.playerCaption}>Archivo final disponible para revisar.</p>}
        </section>

        <aside className={s.resultAside} aria-label="Resumen del resultado">
          <div className={s.statusTop}><span className={s.statusDot} data-state={hasError ? "error" : generating ? "generating" : hasChanges ? "changed" : allReady ? "ready" : "pending"} /><span>{hasError ? "Revisar una escena" : generating ? "Generando escenas" : hasChanges ? "Cambios pendientes" : allReady ? "Escenas listas" : "En preparación"}</span></div>
          <h2>Tu anuncio, de un vistazo</h2>
          <p>{hasError ? "Revisa la escena con error desde el editor." : generating ? "Puedes revisar las escenas listas mientras continúa la generación." : allReady && !previewUrl ? "Los clips están listos para revisar, pero aún no están unidos." : "Revisa cada escena y vuelve a editar si quieres ajustar algo."}</p>
          <div className={s.facts}>
            <span><Clock3 aria-hidden="true" />{getVideoDuration(chunks)} s</span>
            <span><Film aria-hidden="true" />{chunks.length} {chunks.length === 1 ? "escena" : "escenas"}</span>
            <span>{format}</span>
            <span><Check aria-hidden="true" />{readyCount}/{chunks.length} listas</span>
          </div>
          <div className={s.actions}>
            {downloadUrl ? <a className={s.download} href={downloadUrl} download="pixelfm-video.mp4" target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" />Descargar video</a> : <button type="button" className={s.download} disabled><Download aria-hidden="true" />Descargar video</button>}
            {!downloadUrl && <small>{downloadHelp}</small>}
            <button type="button" className={s.edit} onClick={onEdit}><ArrowLeft aria-hidden="true" />Editar anuncio</button>
          </div>
        </aside>
      </div>

      <section className={s.sequence} aria-labelledby="video-result-scenes">
        <div className={s.sequenceHeading}><div><span>SECUENCIA</span><h2 id="video-result-scenes">Escenas del anuncio</h2></div><p>{readyCount} de {chunks.length} listas</p></div>
        <div className={s.sceneGrid}>{chunks.map((chunk, index) => {
          const state = states[index]
          const clipUrl = isVideoUrl(chunk.videoUrl) ? chunk.videoUrl : null
          return <article className={s.scene} data-state={state} key={chunk.id}>
            <div className={s.sceneMedia}>{clipUrl ? <video src={clipUrl} controls playsInline preload="none" poster={chunk.referenceImageUrl} aria-label={`Video de escena ${index + 1}`} /> : chunk.referenceImageUrl ? <img src={chunk.referenceImageUrl} alt={`Referencia de escena ${index + 1}`} /> : <Film aria-hidden="true" />}</div>
            <div className={s.sceneContent}>
              <div className={s.sceneMeta}><span>ESCENA {String(index + 1).padStart(2, "0")}</span><span>{chunk.duration} s</span></div>
              <h3>{chunk.purpose}</h3>
              <p>{getSceneDescription(chunk)}</p>
              <span className={s.sceneState}>{STATE_LABELS[state]}</span>
              {clipUrl && state !== "ready" && <small className={s.previous}>El clip mostrado es una versión anterior.</small>}
              <div className={s.sceneActions}><button type="button" onClick={() => onEditScene(chunk.id)}><PencilLine aria-hidden="true" />Editar escena</button><button type="button" disabled title="Regeneración desde Resultado aún no disponible"><RotateCcw aria-hidden="true" />Regenerar escena</button></div>
            </div>
          </article>
        })}</div>
        <p className={s.regenerateNote}>La regeneración directa desde Resultado estará disponible más adelante. Por ahora puedes volver al editor sin perder tus escenas.</p>
      </section>
    </div>
  </main>
}
