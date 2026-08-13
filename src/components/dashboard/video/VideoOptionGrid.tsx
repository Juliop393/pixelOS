import type { VideoOption } from "./video-data"
import s from "./VideoWorkspace.module.css"

export default function VideoOptionGrid({ options, selected, onSelect }: { options: VideoOption[]; selected: string; onSelect: (id: string) => void }) {
  return <div className={s.optionGrid}>{options.map((option) => (
    <button type="button" key={option.id} className={`${selected === option.id ? s.optionActive : ""} ${option.swatch ? s.styleOption : ""}`} onClick={() => onSelect(option.id)}>
      <i className={option.swatch ? s.optionSwatch : ""} style={option.swatch ? { background: option.swatch } : undefined}>{option.icon}</i><span><b>{option.label}</b><small>{option.description}</small></span><em>{selected === option.id ? "✓" : ""}</em>
    </button>
  ))}</div>
}
