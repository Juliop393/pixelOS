import { BadgePercent, Clapperboard, ImagePlus, PlaySquare, Sparkles, Trash2, Upload, UsersRound, WandSparkles } from "lucide-react"
import PixelAiIcon from "@/components/dashboard/PixelAiIcon"
import { VIDEO_GENERATION_DURATION } from "./video-data"
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
  onUpload, onClear, onIdea, onCreate,
  generating, videoUrl, generationError,
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
  onUpload: (file?: File) => void
  onClear: () => void
  onIdea: () => void
  onCreate: () => void
  generating: boolean
  videoUrl: string | null
  generationError: string
}) {
  const canContinue = Boolean(referenceImageUrl?.startsWith("https://") && goal.trim() && !uploading && !generating)

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

          <div className={s.durationFixed}><span>Duración</span><strong>{VIDEO_GENERATION_DURATION} segundos</strong></div>

          <div className={s.createArea}>
            <p className={s.planExplainer}>Genera un solo clip a partir de tu imagen, objetivo y enfoque.</p>
            <button type="button" className={s.createButton} onClick={onCreate} disabled={!canContinue}><WandSparkles aria-hidden="true" />{generating ? "Generando tu video…" : "Crear video"}</button>
            <p>{generating ? "Puedes revisar tu configuración mientras se genera." : canContinue ? "El resultado aparecerá aquí sin salir de Modo Simple." : "Añade una imagen y describe tu idea para continuar."}</p>
          </div>
        </div>
      </div>
      {(generating || videoUrl || generationError) && <section className={`${s.resultSection} ${videoUrl ? s.resultWithPlayer : ""}`} aria-label="Resultado del video" aria-live="polite">
        <div className={s.resultHeading}><span>VIDEO · MODO SIMPLE</span><h2>{generating ? "Generando tu video…" : generationError ? "No se pudo generar el video" : "Tu video está listo"}</h2>
          <p>{generating ? "Tu imagen, objetivo y enfoque permanecen disponibles mientras se prepara el clip." : generationError ? "Tu configuración se conservó. Puedes volver a intentarlo." : "Reproduce tu clip sin salir de Modo Simple."}</p>
        </div>
        {generationError && <p className={s.resultError} role="alert">{generationError}</p>}
        {videoUrl && <div className={s.resultPlayer}><video key={videoUrl} src={videoUrl} controls playsInline preload="metadata" poster={referenceImageUrl ?? undefined} aria-label="Video generado en Modo Simple" /><small>{generating || generationError ? "Se muestra el último clip generado; los cambios recientes aún no aparecen en él." : "Si cambias la configuración, genera otro clip para aplicar los cambios."}</small></div>}
      </section>}
    </div>
  </main>
}
