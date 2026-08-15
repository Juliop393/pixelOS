import { Download, Film, Sparkles } from "lucide-react"
import type { VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

export default function VideoPreview(props: {
  previewUrl: string | null; activeChunk: VideoChunk; activeIndex: number; totalDuration: number
  hookLabel?: string; angleLabel?: string; styleLabel?: string; strategyFeedback: string; onRecommend: () => void
}) {
  const { previewUrl, activeChunk, activeIndex, totalDuration, hookLabel, angleLabel, styleLabel } = props

  return <>
    <header className={s.stageHeader}>
      <div><span className={s.liveDot} /><span><b>Vista previa</b><small>Fragmento {activeIndex + 1} · {activeChunk.purpose}</small></span></div>
      <div className={s.duration}><small>Duración estimada</small><b>{totalDuration}s</b></div>
    </header>
    <div className={s.previewStage}>
      <div className={s.phoneFrame}>
        {activeChunk.videoUrl ? <video src={activeChunk.videoUrl} controls playsInline /> : previewUrl ? <img src={previewUrl} alt="Preview del fragmento activo" /> : <div className={s.previewEmpty}><Film /><p>Selecciona una imagen para preparar este fragmento.</p></div>}
        {!activeChunk.videoUrl && <div className={s.previewOverlay}><span>FRAGMENTO {activeIndex + 1}</span><b>{activeChunk.purpose}</b><small>6 segundos · {styleLabel}</small></div>}
      </div>
      <aside className={s.directionCard}>
        <span><Sparkles />RESUMEN CREATIVO</span>
        <dl className={s.creativeSummary}>
          <div><dt>Ángulo</dt><dd>{angleLabel || "Sin seleccionar"}</dd></div>
          <div><dt>Gancho</dt><dd>{hookLabel || "Sin seleccionar"}</dd></div>
          <div><dt>Estilo</dt><dd>{styleLabel || "Sin seleccionar"}</dd></div>
        </dl>
        {activeChunk.videoUrl && <a className={s.downloadChunk} href={activeChunk.videoUrl} download><Download />Descargar fragmento</a>}
      </aside>
    </div>
  </>
}
