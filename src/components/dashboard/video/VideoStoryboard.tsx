"use client"

import { Clapperboard, Clock3, SlidersHorizontal, WandSparkles } from "lucide-react"
import type { VideoChunk } from "./video-data"
import s from "./VideoWorkspace.module.css"

const STATUS_LABELS: Record<VideoChunk["status"], string> = {
  pending: "Pendiente",
  configured: "Lista",
  generating: "Generando",
  generated: "Generada",
  error: "Revisar",
}

function sceneFallback(purpose: string, hookLabel?: string, angleLabel?: string) {
  if (purpose.includes("Gancho")) return `Abre con ${hookLabel?.toLowerCase() || "un gancho claro"} para captar atención.`
  if (purpose.includes("Producto")) return "Presenta el producto y demuestra su uso principal."
  if (purpose.includes("Beneficio")) return `Refuerza ${angleLabel?.toLowerCase() || "el beneficio central"} de forma visual.`
  if (purpose.includes("Prueba")) return "Añade una prueba o detalle que sostenga la promesa."
  if (purpose.includes("CTA")) return "Cierra con una acción clara para el espectador."
  return "Desarrolla el siguiente momento de la historia."
}

type VideoStoryboardProps = {
  chunks: VideoChunk[]
  angleLabel?: string
  hookLabel?: string
  styleLabel?: string
  sourceReady: boolean
  canGenerate: boolean
  generateFeedback: string
  onAdjust: () => void
  onGenerate: () => void
}

export default function VideoStoryboard({
  chunks,
  angleLabel,
  hookLabel,
  styleLabel,
  sourceReady,
  canGenerate,
  generateFeedback,
  onAdjust,
  onGenerate,
}: VideoStoryboardProps) {
  const totalDuration = chunks.reduce((total, chunk) => total + chunk.duration, 0)

  return <main className={s.storyboardOverview}>
    <div className={s.storyboardInner}>
      <header className={s.storyboardHero}>
        <div className={s.storyboardHeroCopy}>
          <span>STORYBOARD PROPUESTO</span>
          <h1>Tu anuncio, listo para revisar.</h1>
          <p>Valida la idea y la secuencia. Puedes generar directamente o entrar al detalle de cada escena.</p>
        </div>
        <div className={s.storyboardActions}>
          <div className={s.storyboardDuration}><Clock3 /><span>Duración estimada</span><b>{totalDuration}s</b></div>
          <button type="button" className={s.storyboardGenerate} disabled={!canGenerate} onClick={onGenerate}><WandSparkles />Generar video</button>
          <button type="button" className={s.storyboardAdjust} onClick={onAdjust}><SlidersHorizontal />Ajustar escenas</button>
          <small>{generateFeedback || (sourceReady ? "Storyboard listo para generar" : "Añade una fuente visual desde Ajustar escenas")}</small>
        </div>
      </header>

      <section className={s.globalBrief}>
        <header>
          <span>ESTRATEGIA GLOBAL</span>
          <h2>{angleLabel || "Hipótesis del anuncio"}</h2>
          <p>Esta dirección se aplica al anuncio completo; las escenas desarrollan la historia sin redefinirla.</p>
        </header>
        <dl>
          <div><dt>Hipótesis / ángulo</dt><dd>{angleLabel || "Por definir"}</dd></div>
          <div><dt>Hook principal</dt><dd>{hookLabel || "Por definir"}</dd></div>
          <div><dt>CTA</dt><dd>Se define en la escena final</dd></div>
          <div><dt>Estilo general</dt><dd>{styleLabel || "Por definir"}</dd></div>
          <div><dt>Formato</dt><dd>Stories / Reels · 9:16</dd></div>
        </dl>
      </section>

      <section className={s.storyboardSection}>
        <header>
          <div><span>SECUENCIA</span><h2>Storyboard del anuncio</h2></div>
          <p><Clapperboard />{chunks.length} {chunks.length === 1 ? "escena" : "escenas"} · {totalDuration} segundos</p>
        </header>
        <div className={s.storyboardTrack}>
          {chunks.map((chunk, index) => <article key={chunk.id} className={s.storyboardScene} data-status={chunk.status}>
            <div className={s.storyboardSceneMeta}><span>{String(index + 1).padStart(2, "0")}</span><b>{chunk.duration}s</b></div>
            <h3>{chunk.purpose}</h3>
            <p>{chunk.sceneDirection.trim() || sceneFallback(chunk.purpose, hookLabel, angleLabel)}</p>
            <footer><i />{STATUS_LABELS[chunk.status]}</footer>
          </article>)}
        </div>
      </section>

      <footer className={s.storyboardLegend}>
        <span>Global: hipótesis, hook, CTA, estilo y formato.</span>
        <span>Por escena: referencia, acción, encuadre, diálogo y dirección.</span>
      </footer>
    </div>
  </main>
}
