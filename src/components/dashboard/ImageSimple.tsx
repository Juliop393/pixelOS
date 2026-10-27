"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { BadgePercent, Download, ImagePlus, Maximize2, Minus, Package, Plus, Sparkles, UsersRound } from "lucide-react"
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
  referenceUploader, phase, result, generatedImages, error, showReference,
  onSelectResult, onDownload, onDownloadAll, onChangeReference,
  prompt, onPromptChange, approach, onApproachChange,
  format, onFormatChange, quantity, onQuantityChange, onOpenPixelAi, onGenerate, loading, canGenerate, credits,
}: {
  referenceUploader: ReactNode
  phase: "select" | "loading" | "result" | "error"
  result: { imageUrl: string; copy: string; angle: string } | null
  generatedImages: Array<{ imageUrl: string; angle: string }>
  error: string | null
  showReference: boolean
  onSelectResult: (image: { imageUrl: string; angle: string }) => void
  onDownload: () => void
  onDownloadAll: () => void
  onChangeReference: () => void
  prompt: string
  onPromptChange: (value: string) => void
  approach: SimpleImageApproach
  onApproachChange: (value: SimpleImageApproach) => void
  format: string
  onFormatChange: (value: string) => void
  quantity: number
  onQuantityChange: (value: number) => void
  onOpenPixelAi: () => void
  onGenerate: () => void
  loading: boolean
  canGenerate: boolean
  credits: number
}) {
  const resultPanelRef = useRef<HTMLElement>(null)
  const activeIndex = Math.max(0, generatedImages.findIndex((image) => image.imageUrl === result?.imageUrl))
  const activeImage = generatedImages[activeIndex]
  const showResultPanel = phase === "loading" || (!showReference && (phase === "error" || (phase === "result" && !!activeImage)))

  useEffect(() => {
    if (showResultPanel) resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [phase, showResultPanel])

  return <div className={s.simple}>
    <header className={s.hero}>
      <span>IMAGEN · MODO SIMPLE</span>
      <h1>Tu imagen empieza con una idea.</h1>
      <p>Cuéntanos qué quieres crear y PixelFM preparará el resto.</p>
    </header>
    <div className={s.layout}>
      <div className={s.referenceColumn} data-format={format}>{showResultPanel ?
        <section ref={resultPanelRef} className={`${workspace.formCard} ${s.inlineResult}`} aria-label={phase === "result" ? "Resultado de imagen" : "Estado de generación"}>
          <div className={workspace.formHeading}><span>01</span><div><h2>{phase === "result" ? "Tu imagen" : "Referencia visual"}</h2><p>{phase === "result" ? "Tu creativo está listo en este espacio." : "La imagen que ayudará a PixelFM a mantener tu producto y estilo."}</p></div></div>
          <div className={s.inlineStage} aria-live={phase === "loading" ? "polite" : undefined}>
            {phase === "loading" && <div className={s.inlineMessage} role="status"><span className={s.loadingIcon}><Sparkles aria-hidden="true" /></span><b>Generando tu creativo...</b><p>PixelFM está preparando tu imagen.</p></div>}
            {phase === "error" && <div className={s.inlineMessage} role="alert"><span className={s.errorIcon}>!</span><b>No se pudo generar la imagen</b><p>{error || "Intenta de nuevo."}</p></div>}
            {phase === "result" && activeImage && <img className={s.generatedImage} src={activeImage.imageUrl} alt={`Creativo generado ${activeIndex + 1}`} />}
          </div>
          {phase === "result" && activeImage && <>
            {generatedImages.length > 1 && <div className={s.resultThumbnails} aria-label="Resultados generados">
              {generatedImages.map((image, index) => <button key={`${image.imageUrl}-${index}`} type="button" className={index === activeIndex ? s.activeThumbnail : ""} aria-label={`Ver creativo ${index + 1}`} aria-pressed={index === activeIndex} onClick={() => onSelectResult(image)}><img src={image.imageUrl} alt="" /><span>{index + 1}</span></button>)}
            </div>}
            <div className={s.resultActions}>
              <span>Resultado {activeIndex + 1} de {generatedImages.length}</span>
              <div>
                <a href={activeImage.imageUrl} target="_blank" rel="noreferrer"><Maximize2 aria-hidden="true" />Ampliar</a>
                <button type="button" onClick={onDownload}><Download aria-hidden="true" />Descargar</button>
                {generatedImages.length > 1 && <button type="button" onClick={onDownloadAll}>Descargar todas</button>}
                <button type="button" onClick={onChangeReference}>Cambiar referencia</button>
              </div>
            </div>
          </>}
          {phase === "error" && <button type="button" className={s.changeAfterError} onClick={onChangeReference}>Cambiar referencia</button>}
        </section> : referenceUploader}</div>
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
      <div className={s.formatControls}>
        <div className={s.formats} aria-label="Formato de imagen">
          {FORMATS.map(({ id, label }) => <button key={id} type="button" className={format === id ? s.selected : ""} aria-pressed={format === id} onClick={() => onFormatChange(id)}>{label}</button>)}
        </div>
        <div className={s.quantity} role="group" aria-label="Cantidad de imágenes">
          <span>Cantidad</span>
          <div className={s.quantityStepper}>
            <button type="button" aria-label="Reducir cantidad de imágenes" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} disabled={loading || quantity <= 1}><Minus aria-hidden="true" /></button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" aria-label="Aumentar cantidad de imágenes" onClick={() => onQuantityChange(Math.min(10, quantity + 1))} disabled={loading || quantity >= 10}><Plus aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </section>

    <div className={s.createArea}>
      <button type="button" className={workspace.generateButton} onClick={onGenerate} disabled={!canGenerate}><ImagePlus aria-hidden="true" />{loading ? `Generando ${quantity} ${quantity === 1 ? "imagen" : "imágenes"}…` : `Generar ${quantity} ${quantity === 1 ? "imagen" : "imágenes"}`}<b>→</b></button>
      <p>PixelFM preparará la estrategia y composición a partir de tu idea.</p>
      <small>{quantity} crédito{quantity === 1 ? "" : "s"} necesarios · {credits} disponible{credits === 1 ? "" : "s"}</small>
    </div>
      </div>
    </div>
  </div>
}
