import { Gauge, Gem } from "lucide-react"
import { VIDEO_MODELS, type VideoModelId } from "@/lib/pricing-plans"
import s from "./VideoModelPicker.module.css"

const ICONS = { rapid: Gauge, premium: Gem } as const

/** Two video tiers. Credits and length come from the shared catalog; the server charges the same table. */
export default function VideoModelPicker({ value, onChange, disabled = false, compact = false }: {
  value: VideoModelId
  onChange: (model: VideoModelId) => void
  disabled?: boolean
  compact?: boolean
}) {
  return <div className={`${s.picker} ${compact ? s.compact : ""}`} role="radiogroup" aria-label="Calidad del video">
    {VIDEO_MODELS.map((model) => {
      const Icon = ICONS[model.id]
      const selected = model.id === value
      return <button
        key={model.id}
        type="button"
        role="radio"
        aria-checked={selected}
        className={selected ? s.selected : ""}
        disabled={disabled}
        onClick={() => onChange(model.id)}
      >
        <Icon aria-hidden="true" />
        <span>
          <b>{model.label}</b>
          {!compact && <small>{model.detail}</small>}
        </span>
        <em>{model.credits} créditos · {model.durationSeconds} s</em>
      </button>
    })}
  </div>
}
