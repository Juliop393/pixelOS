import { ArrowLeft, ArrowRight, Clapperboard, Plus, Trash2 } from "lucide-react"
import type { VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

export default function VideoTimeline({ chunks, activeId, hookLabel, onSelect, onAdd, onRemove, onMove }: {
  chunks: VideoChunk[]; activeId: number; hookLabel: string | undefined
  onSelect: (id: number) => void; onAdd: () => void; onRemove: (id: number) => void; onMove: (index: number, direction: -1 | 1) => void
}) {
  return <section className={s.timeline}>
    <header><div><span>TIMELINE</span><h2>Construye tu secuencia</h2></div><p>Cada fragmento representa 6 segundos</p></header>
    <div className={s.chunkTrack}>
      {chunks.map((chunk, index) => <div key={chunk.id} className={s.chunkItem}>
        <button className={`${s.chunkCard} ${activeId === chunk.id ? s.chunkActive : ""}`} onClick={() => onSelect(chunk.id)}>
          <span><i>0{index + 1}</i><small>{chunk.duration}s</small></span>
          <div><Clapperboard /><span><b>{chunk.purpose}</b><small>{index === 0 ? hookLabel : "Continuidad narrativa"}</small></span></div>
        </button>
        <div className={s.chunkActions}>
          <button onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="Mover fragmento a la izquierda"><ArrowLeft /></button>
          <button onClick={() => onMove(index, 1)} disabled={index === chunks.length - 1} aria-label="Mover fragmento a la derecha"><ArrowRight /></button>
          <button onClick={() => onRemove(chunk.id)} disabled={chunks.length === 1} aria-label="Eliminar fragmento"><Trash2 /></button>
        </div>
        {index < chunks.length - 1 && <span className={s.connector}>→</span>}
      </div>)}
      {chunks.length < 5 && <button className={s.addChunk} onClick={onAdd}><Plus /><b>Añadir fragmento</b><small>+ 6 segundos</small></button>}
    </div>
    <footer><span>{chunks.length} {chunks.length === 1 ? "fragmento" : "fragmentos"}</span><i /><b>{chunks.length * 6} segundos totales</b><small>Máximo: 5 fragmentos · 30s</small></footer>
  </section>
}
