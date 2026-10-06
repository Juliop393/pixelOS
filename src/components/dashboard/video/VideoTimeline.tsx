import { ArrowLeft, ArrowRight, Clapperboard, Download, Link2, Plus, Trash2 } from "lucide-react"
import { getSceneDescription, getVideoDuration, VIDEO_GENERATION_DURATION, VIDEO_MAX_SCENES, type VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

const STATUS_LABEL = { pending: "Sin generar", configured: "Sin generar", generating: "Generando…", generated: "Lista", error: "Error" }

export default function VideoTimeline({ chunks, activeId, format, finalVideoUrl, onSelect, onAdd, onRemove, onMove, onMerge }: {
  chunks: VideoChunk[]; activeId: number; format: string; finalVideoUrl: string | null
  onSelect: (id: number) => void; onAdd: () => void; onRemove: (id: number) => void; onMove: (index: number, direction: -1 | 1) => void; onMerge: () => void
}) {
  const generatedCount = chunks.filter((chunk) => chunk.status === "generated" && chunk.videoUrl).length
  const overallStatus = chunks.some((chunk) => chunk.status === "generating")
    ? { label: "Generando", tone: "generating" }
    : chunks.some((chunk) => chunk.status === "error")
      ? { label: "Requiere revisión", tone: "error" }
      : generatedCount === chunks.length
        ? { label: "Video listo", tone: "generated" }
        : chunks.some((chunk) => chunk.status === "configured")
          ? { label: "Listo para generar", tone: "configured" }
          : { label: "En preparación", tone: "pending" }
  return <section className={s.timeline}>
    <header><div><span>MODO PRO</span><h2>Secuencia</h2></div></header>
    <div className={s.chunkTrack}>
      {chunks.map((chunk, index) => <div key={chunk.id} className={s.chunkItem}>
        <button className={`${s.chunkCard} ${activeId === chunk.id ? s.chunkActive : ""}`} data-status={chunk.status} onClick={() => onSelect(chunk.id)}>
          <span><i>Escena {String(index + 1).padStart(2, "0")}</i><small>{chunk.duration}s · {STATUS_LABEL[chunk.status]}</small></span>
          <div><Clapperboard /><span><b>{chunk.purpose}</b><small>{getSceneDescription(chunk)}</small></span></div>
        </button>
        <div className={s.chunkActions}>
          <button onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="Mover escena a la izquierda"><ArrowLeft /></button>
          <button onClick={() => onMove(index, 1)} disabled={index === chunks.length - 1} aria-label="Mover escena a la derecha"><ArrowRight /></button>
          <button onClick={() => onRemove(chunk.id)} disabled={chunks.length === 1 || chunk.status === "generating"} aria-label="Eliminar escena"><Trash2 /></button>
        </div>
        {index < chunks.length - 1 && <span className={s.connector}>→</span>}
      </div>)}
      {chunks.length < VIDEO_MAX_SCENES && <button className={s.addChunk} onClick={onAdd}><Plus /><b>Añadir escena</b><small>+ {VIDEO_GENERATION_DURATION} s</small></button>}
    </div>
    <footer className={s.timelineSummary}>
      <div className={s.timelineSummaryFacts} data-status={overallStatus.tone} aria-label="Resumen de producción"><b>{getVideoDuration(chunks)} s</b><i /><span>{chunks.length} {chunks.length === 1 ? "escena" : "escenas"}</span><i /><span>{format}</span><i /><span>{overallStatus.label}</span></div>
      {(generatedCount >= 2 || finalVideoUrl) && <div className={s.timelineSummaryActions}>{generatedCount >= 2 && <button onClick={onMerge}><Link2 />Unir secuencia</button>}{finalVideoUrl && <a href={finalVideoUrl} download><Download />Descargar video</a>}</div>}
    </footer>
  </section>
}
