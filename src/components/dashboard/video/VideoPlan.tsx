import { ArrowLeft, ArrowRight, Clock3, PencilLine, WandSparkles } from "lucide-react"
import { getPlanSceneLabel, SIMPLE_DURATION_LABELS, SIMPLE_DURATION_RANGES, type SimpleDuration } from "./video-plan"
import { getSceneDescription, type VideoChunk } from "./video-data"
import s from "./VideoPlan.module.css"

const STATUS_LABELS: Record<VideoChunk["status"], string> = {
  pending: "Pendiente",
  configured: "Lista para revisar",
  generating: "Generando",
  generated: "Generada",
  error: "Revisar",
}

export default function VideoPlan({
  chunks, goal, styleLabel, duration, referenceImageUrl, notice, onBack, onGenerate, onEdit,
}: {
  chunks: VideoChunk[]
  goal: string
  styleLabel: string
  duration: SimpleDuration
  referenceImageUrl: string | null
  notice: string
  onBack: () => void
  onGenerate: () => void
  onEdit: () => void
}) {
  return <main className={s.plan} aria-labelledby="video-plan-title">
    <div className={s.inner}>
      <header className={s.hero}>
        <button type="button" className={s.back} onClick={onBack}><ArrowLeft aria-hidden="true" />Volver a Simple</button>
        <span>PROPUESTA INICIAL</span>
        <h1 id="video-plan-title">Plan del anuncio</h1>
        <p>Una primera estructura basada en tu idea. Revísala y, si quieres, ajusta cada escena antes de generar.</p>
      </header>

      <section className={s.summary} aria-label="Resumen del anuncio">
        <div className={s.summaryImage}>{referenceImageUrl ? <img src={referenceImageUrl} alt="Referencia visual del anuncio" /> : <span>Sin referencia</span>}</div>
        <div className={s.summaryGoal}><small>OBJETIVO</small><p title={goal}>{goal}</p></div>
        <div className={s.summaryMeta}><div><small>ESTILO</small><b>{styleLabel}</b></div><div><small>DURACIÓN DESEADA</small><b>{SIMPLE_DURATION_LABELS[duration]} <em>{SIMPLE_DURATION_RANGES[duration]}</em></b></div></div>
      </section>

      <section className={s.scenes} aria-labelledby="video-plan-scenes">
        <div className={s.sectionTitle}><div><span>ESTRUCTURA PROPUESTA</span><h2 id="video-plan-scenes">Así podría avanzar tu video</h2></div><p>{chunks.length} {chunks.length === 1 ? "escena" : "escenas"} · Duración orientativa</p></div>
        <div className={s.sceneGrid} data-count={chunks.length}>{chunks.map((chunk, index) => <article className={s.scene} key={chunk.id}>
          <div className={s.sceneTop}><span>{String(index + 1).padStart(2, "0")}</span><small><Clock3 aria-hidden="true" />~{chunk.duration} s</small></div>
          <h3>{getPlanSceneLabel(chunk.purpose)}</h3>
          <p>{getSceneDescription(chunk)}</p>
          <footer><i aria-hidden="true" />{STATUS_LABELS[chunk.status]}</footer>
        </article>)}</div>
      </section>

      <div className={s.actions}>
        <div><b>Tu estructura está lista para revisar.</b><p>La generación actual se confirma en Modo Pro y funciona por escena; este plan todavía no crea un video completo automáticamente.</p>{notice && <p className={s.notice} role="status">{notice}</p>}</div>
        <div className={s.buttons}><button type="button" className={s.edit} onClick={onEdit}><PencilLine aria-hidden="true" />Editar escenas</button><button type="button" className={s.generate} onClick={onGenerate}><WandSparkles aria-hidden="true" />Generar video<ArrowRight aria-hidden="true" /></button></div>
      </div>
    </div>
  </main>
}
