import s from "./VideoWorkspace.module.css"

type VideoSceneFieldProps = {
  id: string
  label: string
  value: string
  placeholder: string
  helper: string
  suggestions: string[]
  optional?: boolean
  disabled?: boolean
  maxLength?: number
  onChange: (value: string) => void
}

export default function VideoSceneField({
  id,
  label,
  value,
  placeholder,
  helper,
  suggestions,
  optional = false,
  disabled = false,
  maxLength = 400,
  onChange,
}: VideoSceneFieldProps) {
  return <div className={s.sceneField}>
    <div className={s.sceneFieldHeading}>
      <label htmlFor={id}>{label}</label>
      {optional && <span>Opcional</span>}
    </div>
    <div className={s.sceneSuggestions} aria-label={`Ideas para ${label.toLowerCase()}`}>
      {suggestions.map((suggestion) => <button
        type="button"
        key={suggestion}
        disabled={disabled}
        onClick={() => onChange(suggestion)}
      >{suggestion}</button>)}
    </div>
    <textarea
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      maxLength={maxLength}
      rows={7}
      placeholder={placeholder}
    />
    <footer><span>{helper}</span><b>{value.length}/{maxLength}</b></footer>
  </div>
}
