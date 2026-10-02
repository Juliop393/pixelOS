import { BadgePercent, Clapperboard, ImagePlus, PlaySquare, Sparkles, Trash2, Upload, UsersRound, WandSparkles } from "lucide-react"
import PixelAiIcon from "@/components/dashboard/PixelAiIcon"
import { SIMPLE_DURATION_LABELS, SIMPLE_DURATION_RANGES, type SimpleDuration } from "./video-plan"
import s from "./VideoSimple.module.css"

export const SIMPLE_APPROACHES = [
  { id: "auto", label: "IA decide", detail: "PixelFM elige el enfoque más adecuado", Icon: Sparkles },
  { id: "demo", label: "Producto en acción", detail: "Muestra cómo funciona o se utiliza", Icon: PlaySquare },
  { id: "ugc", label: "UGC / natural", detail: "Cercano, espontáneo y humano", Icon: UsersRound },
  { id: "commercial", label: "Oferta directa", detail: "Presenta rápidamente el valor o promoción", Icon: BadgePercent },
  { id: "cinematic", label: "Cinemático", detail: "Más visual, cuidado y aspiracional", Icon: Clapperboard },
] as const

export type SimpleApproach = (typeof SIMPLE_APPROACHES)[number]["id"] | "custom"

export default function VideoSimple({
  referenceImageUrl, referenceFileName, fileError, uploading,
  goal, onGoalChange, approach, styleLabel, onApproachChange,
  duration, onDurationChange, onUpload, onClear, onIdea, onCreate,
}: {
  referenceImageUrl: string | null
  referenceFileName: string
  fileError: string
  uploading: boolean
  goal: string
  onGoalChange: (value: string) => void
  approach: SimpleApproach
  styleLabel?: string
  onApproachChange: (approach: Exclude<SimpleApproach, "custom">) => void
  duration: SimpleDuration
  onDurationChange: (duration: SimpleDuration) => void
  onUpload: (file?: File) => void
  onClear: () => void
  onIdea: () => void
  onCreate: () => void
}) {
  const canContinue = Boolean(referenceImageUrl?.startsWith("https://") && goal.trim() && !uploading)

  return <main className={s.simple} aria-labelledby="video-simple-title">
    <div className={s.inner}>
      <header className={s.hero}>
        <span>VIDEO · MODO SIMPLE</span>
        <h1 id="video-simple-title">Tu video empieza con una idea.</h1>
        <p>Elige una imagen, cuenta qué quieres lograr y deja que PixelFM prepare el enfoque.</p>
      </header>

      <div className={s.layout}>
        <section className={s.reference} aria-labelledby="simple-reference-title">
          <div className={s.sectionHeading}><span>01</span><div><h2 id="simple-reference-title">Referencia visual</h2><p>La imagen que dará vida a tu video.</p></div></div>
          {referenceImageUrl ? <div className={s.preview}><img src={referenceImageUrl} alt="Referencia visual elegida" /></div> : <label className={s.uploadZone}>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { onUpload(event.target.files?.[0]); event.currentTarget.value = "" }} />
            <span><ImagePlus aria-hidden="true" /></span>
            <b>{uploading ? "Subiendo imagen..." : "Subir imagen"}</b>
            <small>JPG, PNG o WEBP · máximo 5 MB</small>
          </label>}
          {referenceImageUrl && <div className={s.referenceActions}>
            <span title={referenceFileName}>{referenceFileName || "Imagen seleccionada"}</span>
            <label><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { onUpload(event.target.files?.[0]); event.currentTarget.value = "" }} /><Upload aria-hidden="true" />Cambiar</label>
            <button type="button" onClick={onClear} aria-label="Quitar referencia visual"><Trash2 aria-hidden="true" /></button>
          </div>}
          {fileError && <p className={s.error} role="alert">{fileError}</p>}
        </section>

        <div className={s.decisions}>
          <section className={s.goalSection} aria-labelledby="simple-goal-title">
            <div className={s.sectionHeading}><span>02</span><div><h2 id="simple-goal-title">Qué quieres lograr</h2><p>Describe la idea o el resultado que quieres conseguir.</p></div></div>
            <textarea value={goal} onChange={(event) => onGoalChange(event.target.value)} rows={4} maxLength={700} aria-label="Qué quieres lograr" placeholder="Ej. Quiero mostrar este producto en uso y destacar que ahorra tiempo." />
            <button type="button" className={s.pixelAiHelp} onClick={onIdea}><PixelAiIcon aria-hidden="true" />¿No sabes qué crear? Generar una idea con PixelIA</button>
          </section>

          <section className={s.styleSection} aria-labelledby="simple-style-title">
            <div className={s.sectionHeading}><span>03</span><div><h2 id="simple-style-title">Enfoque del video</h2><p>Elige una dirección sencilla o deja que PixelFM decida.</p></div></div>
            <div className={s.styleGrid}>
              {SIMPLE_APPROACHES.map(({ id, label, detail, Icon }) => <button key={id} type="button" className={approach === id ? s.selected : ""} aria-pressed={approach === id} onClick={() => onApproachChange(id)}><Icon aria-hidden="true" /><span><b>{label}{id === "auto" && <em>Recomendado</em>}</b><small>{detail}</small></span></button>)}
            </div>
            {approach === "custom" && <p className={s.advancedStyle}>Estilo actual de Modo Pro: {styleLabel}</p>}
          </section>

          <section className={s.durationSection} aria-labelledby="simple-duration-title">
            <div className={s.sectionHeading}><span>04</span><div><h2 id="simple-duration-title">Duración</h2><p>¿Qué extensión imaginas para tu anuncio?</p></div></div>
            <div className={s.durationChoices}>{(Object.keys(SIMPLE_DURATION_LABELS) as SimpleDuration[]).map((key) => <button key={key} type="button" className={duration === key ? s.selected : ""} aria-pressed={duration === key} onClick={() => onDurationChange(key)}><b>{SIMPLE_DURATION_LABELS[key]}</b><small>{SIMPLE_DURATION_RANGES[key]}</small></button>)}</div>
          </section>

          <div className={s.createArea}>
            <p className={s.planExplainer}>PixelFM preparará el enfoque y la estructura inicial del anuncio para que puedas revisarlos antes de generar.</p>
            <button type="button" className={s.createButton} onClick={onCreate} disabled={!canContinue}><WandSparkles aria-hidden="true" />Crear video</button>
            <p>{canContinue ? "Primero verás el Plan del anuncio; no se iniciará una generación todavía." : "Añade una imagen y describe tu idea para continuar."}</p>
          </div>
        </div>
      </div>
      <footer className={s.note}><Sparkles aria-hidden="true" />La duración es orientativa. Puedes ajustar las escenas en Modo Pro antes de generar.</footer>
    </div>
  </main>
}
