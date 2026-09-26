import { ChevronDown, Compass, Flag, Palette, RectangleVertical, Zap } from "lucide-react"
import { VIDEO_ANGLES, VIDEO_HOOKS, VIDEO_STYLES, type VideoStrategy } from "./video-data"
import s from "./VideoWorkspace.module.css"

export default function VideoStrategyEditor({ strategy, onChange }: {
  strategy: VideoStrategy
  onChange: (patch: Partial<VideoStrategy>) => void
}) {
  return <section className={s.globalStrategyEditor} aria-label="Estrategia global del anuncio">
    <header><div><span>GLOBAL</span><b>Estrategia del anuncio</b></div><small>Una sola dirección creativa para todas las escenas</small></header>
    <div>
      <label><span className={s.strategyControlHeader}><i><Compass /></i>Hipótesis / ángulo</span><span className={s.strategySelectWrap}><select value={strategy.angle} onChange={(event) => onChange({ angle: event.target.value })}>{VIDEO_ANGLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown /></span></label>
      <label><span className={s.strategyControlHeader}><i><Zap /></i>Hook principal</span><span className={s.strategySelectWrap}><select value={strategy.hook} onChange={(event) => onChange({ hook: event.target.value })}>{VIDEO_HOOKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown /></span></label>
      <label><span className={s.strategyControlHeader}><i><Palette /></i>Estilo general</span><span className={s.strategySelectWrap}><select value={strategy.style} onChange={(event) => onChange({ style: event.target.value })}>{VIDEO_STYLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown /></span></label>
      <label><span className={s.strategyControlHeader}><i><Flag /></i>CTA del anuncio</span><span className={s.strategySelectWrap}><input value={strategy.cta} onChange={(event) => onChange({ cta: event.target.value })} maxLength={200} placeholder="Ej. Descubre el producto" /></span><small>Planificación global; aún no se envía al generador.</small></label>
      <label><span className={s.strategyControlHeader}><i><RectangleVertical /></i>Formato global</span><span className={s.strategySelectWrap}><input value={strategy.format} readOnly aria-label="Formato global" /></span><small>Formato disponible actualmente para generación.</small></label>
    </div>
  </section>
}
