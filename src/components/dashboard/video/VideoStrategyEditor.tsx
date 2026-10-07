import { useState } from "react"
import { ChevronDown, Compass, Flag, Palette, RectangleVertical, Zap } from "lucide-react"
import { VIDEO_ANGLES, VIDEO_HOOKS, VIDEO_STYLES, type VideoStrategy } from "./video-data"
import VideoDropdown from "./VideoDropdown"
import s from "./VideoWorkspace.module.css"

export default function VideoStrategyEditor({ strategy, onChange }: {
  strategy: VideoStrategy
  onChange: (patch: Partial<VideoStrategy>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const angleLabel = VIDEO_ANGLES.find((item) => item.id === strategy.angle)?.label ?? "Ángulo por definir"
  const hookLabel = VIDEO_HOOKS.find((item) => item.id === strategy.hook)?.label ?? "Hook por definir"
  const styleLabel = VIDEO_STYLES.find((item) => item.id === strategy.style)?.label ?? "Estilo por definir"

  return <section className={s.globalStrategyEditor} aria-label="Estrategia global del anuncio">
    <header className={s.strategyCompactHeader}>
      <div className={s.strategyCompactCopy}><span>GLOBAL</span><b>Estrategia</b><small title={`${angleLabel} · ${hookLabel} · ${styleLabel}`}>{angleLabel} · {hookLabel} · {styleLabel}</small></div>
      <button type="button" className={s.strategyExpand} aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>{expanded ? "Cerrar" : "Editar"}<ChevronDown /></button>
    </header>
    {expanded && <div className={s.strategyDetails}>
      <p>Se aplica a todo el anuncio.</p>
      <div className={s.strategyFields}>
      <div className={s.strategyField}><span className={s.strategyControlHeader}><i><Compass /></i>Hipótesis / ángulo</span><span className={s.strategySelectWrap}><VideoDropdown label="Hipótesis / ángulo" value={strategy.angle} options={VIDEO_ANGLES.map((item) => ({ value: item.id, label: item.label }))} onChange={(angle) => onChange({ angle })} /></span></div>
      <div className={s.strategyField}><span className={s.strategyControlHeader}><i><Zap /></i>Hook principal</span><span className={s.strategySelectWrap}><VideoDropdown label="Hook principal" value={strategy.hook} options={VIDEO_HOOKS.map((item) => ({ value: item.id, label: item.label }))} onChange={(hook) => onChange({ hook })} /></span></div>
      <div className={s.strategyField}><span className={s.strategyControlHeader}><i><Palette /></i>Estilo general</span><span className={s.strategySelectWrap}><VideoDropdown label="Estilo general" value={strategy.style} options={VIDEO_STYLES.map((item) => ({ value: item.id, label: item.label }))} onChange={(style) => onChange({ style })} /></span></div>
      <label><span className={s.strategyControlHeader}><i><Flag /></i>CTA del anuncio</span><span className={s.strategySelectWrap}><input value={strategy.cta} onChange={(event) => onChange({ cta: event.target.value })} maxLength={200} placeholder="Ej. Descubre el producto" /></span></label>
      <label><span className={s.strategyControlHeader}><i><RectangleVertical /></i>Formato global</span><span className={s.strategySelectWrap}><input value={strategy.format} readOnly aria-label="Formato global" /></span></label>
      </div>
    </div>}
  </section>
}
