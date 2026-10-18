"use client"

import type { ReactNode } from "react"
import { BadgePercent, ImagePlus, Package, Sparkles, UsersRound } from "lucide-react"
import PixelAiIcon from "./PixelAiIcon"
import workspace from "./GeneratorWorkspace.module.css"
import s from "./ImageSimple.module.css"

export const SIMPLE_IMAGE_APPROACHES = [
  { id: "auto", label: "IA decide", detail: "PixelFM elige el enfoque más adecuado", angle: "primary-benefit", style: "white-bg", Icon: Sparkles },
  { id: "product", label: "Producto", detail: "Prioriza el producto y sus detalles", angle: "product-demo", style: "product-action", Icon: Package },
  { id: "ugc", label: "UGC / natural", detail: "Más cercano, espontáneo y humano", angle: "usage-experience", style: "lifestyle", Icon: UsersRound },
  { id: "offer", label: "Oferta", detail: "Más directo, comercial y orientado a vender", angle: "offer-convenience", style: "direct-offer", Icon: BadgePercent },
] as const

export type SimpleImageApproach = (typeof SIMPLE_IMAGE_APPROACHES)[number]["id"]

const FORMATS = [
  { id: "square", label: "1:1" },
  { id: "4:5", label: "4:5" },
  { id: "story", label: "9:16" },
] as const

export default function ImageSimple({
  referenceUploader, prompt, onPromptChange, approach, onApproachChange,
  format, onFormatChange, onOpenPixelAi, onGenerate, loading, canGenerate, credits,
}: {
  referenceUploader: ReactNode
  prompt: string
  onPromptChange: (value: string) => void
  approach: SimpleImageApproach
  onApproachChange: (value: SimpleImageApproach) => void
  format: string
  onFormatChange: (value: string) => void
  onOpenPixelAi: () => void
  onGenerate: () => void
  loading: boolean
  canGenerate: boolean
  credits: number
}) {
  return <div className={s.simple}>
    <header className={s.hero}>
      <span>IMAGEN · MODO SIMPLE</span>
      <h1>Tu imagen empieza con una idea.</h1>
      <p>Cuéntanos qué quieres crear y PixelFM preparará el resto.</p>
    </header>
    <div className={s.layout}>
      <div className={s.referenceColumn}>{referenceUploader}</div>
      <div className={s.decisions}>

    <section className={`${workspace.formCard} ${s.card}`} aria-labelledby="simple-image-prompt-title">
      <div className={workspace.formHeading}><span>02</span><div><h2 id="simple-image-prompt-title">Qué quieres crear</h2><p>Describe el anuncio o resultado que quieres conseguir.</p></div></div>
      <textarea className={`${workspace.panelTextarea} ${s.prompt}`} value={prompt} onChange={(event) => onPromptChange(event.target.value)} maxLength={3000} placeholder="Ej. Quiero un anuncio premium de esta bebida, con el producto en primer plano y una sensación fresca y veraniega." aria-label="Qué quieres crear" />
      <button type="button" className={s.pixelAiHelp} onClick={onOpenPixelAi}><PixelAiIcon aria-hidden="true" />¿Necesitas una idea? Pregúntale a PixelIA</button>
    </section>

    <section className={`${workspace.formCard} ${s.card}`} aria-labelledby="simple-image-approach-title">
      <div className={workspace.formHeading}><span>03</span><div><h2 id="simple-image-approach-title">Enfoque</h2><p>Elige una dirección sencilla o deja que PixelFM decida.</p></div></div>
      <div className={s.approaches}>
        {SIMPLE_IMAGE_APPROACHES.map(({ id, label, detail, Icon }) => <button key={id} type="button" className={approach === id ? s.selected : ""} aria-pressed={approach === id} onClick={() => onApproachChange(id)}>
          <Icon aria-hidden="true" /><span><b>{label}{id === "auto" && <em>Recomendado</em>}</b><small>{detail}</small></span>
        </button>)}
      </div>
    </section>

    <section className={`${workspace.formCard} ${s.card} ${s.formatCard}`} aria-labelledby="simple-image-format-title">
      <div className={workspace.formHeading}><span>04</span><div><h2 id="simple-image-format-title">Formato</h2><p>Elige la proporción de tu imagen.</p></div></div>
      <div className={s.formats}>
        {FORMATS.map(({ id, label }) => <button key={id} type="button" className={format === id ? s.selected : ""} aria-pressed={format === id} onClick={() => onFormatChange(id)}>{label}</button>)}
      </div>
    </section>

    <div className={s.createArea}>
      <button type="button" className={workspace.generateButton} onClick={onGenerate} disabled={!canGenerate}><ImagePlus aria-hidden="true" />{loading ? "Generando imagen…" : "Generar imagen"}<b>→</b></button>
      <p>PixelFM preparará la estrategia y composición a partir de tu idea.</p>
      <small>1 crédito por imagen · {credits} disponible{credits === 1 ? "" : "s"}</small>
    </div>
      </div>
    </div>
  </div>
}
