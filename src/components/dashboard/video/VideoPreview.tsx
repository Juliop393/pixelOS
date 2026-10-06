import { Download, Film } from "lucide-react"
import type { VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

export default function VideoPreview(props: {
  previewUrl: string | null; activeChunk: VideoChunk; activeIndex: number; totalDuration: number
  hookLabel?: string; angleLabel?: string; styleLabel?: string; strategyFeedback: string; onRecommend: () => void
}) {
  const { previewUrl, activeChunk, activeIndex, totalDuration, styleLabel } = props

  return <>
    <header className={s.stageHeader}>
      <div><span className={s.liveDot} /><span><b>Vista previa</b><small>Escena {activeIndex + 1} · {activeChunk.purpose}</small></span></div>
      <div className={s.previewHeaderActions}>{activeChunk.videoUrl && <a className={s.downloadChunk} href={activeChunk.videoUrl} download><Download />Descargar escena</a>}<div className={s.duration}><small>Duración estimada</small><b>{totalDuration}s</b></div></div>
    </header>
    <div className={s.previewStage}>
      <div className={s.phoneFrame}>
        {activeChunk.videoUrl ? <video key={`${activeChunk.id}-${activeChunk.videoUrl}`} src={activeChunk.videoUrl} controls playsInline /> : previewUrl ? <img src={previewUrl} alt="Preview de la escena activa" /> : <div className={s.previewEmpty}><Film /><p>Selecciona una imagen para preparar esta escena.</p></div>}
        {(activeChunk.status === "generating" || activeChunk.status === "error" || !activeChunk.videoUrl) && <div className={s.previewOverlay} role={activeChunk.status === "error" ? "alert" : "status"}>
          <span>ESCENA {activeIndex + 1}</span>
          <b>{activeChunk.status === "generating" ? "Generando esta escena…" : activeChunk.status === "error" ? "No se pudo generar esta escena" : activeChunk.purpose}</b>
          <small>{activeChunk.status === "generating" ? "El video aparecerá aquí cuando esté listo." : activeChunk.status === "error" ? "Revisa la escena e inténtalo de nuevo." : `${activeChunk.duration} segundos · ${activeChunk.sceneStyle.trim() || styleLabel}`}</small>
        </div>}
      </div>
    </div>
  </>
}
