"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import styles from "./GeneratorWorkspace.module.css"

type ResultPanelProps = {
  phase: "select" | "loading" | "result" | "error"
  result: { imageUrl: string; copy: string; angle: string } | null
  generatedImages: Array<{ imageUrl: string; angle: string }>
  progress: { completed: number; total: number }
  error: string | null
  aspectRatio: string
  selectedAngle: string | null
  sessionHistory: Array<{ imageUrl: string; angle: string }>
  showGuides: boolean
  credits?: number
  cantidad?: number
  safeZoneMeta?: boolean
  onRetry: () => void
  onDownload: () => void
  onDownloadAll: () => void
  onSelectFromGenerated: (img: { imageUrl: string; angle: string }, copy: string) => void
  onSelectFromHistory: (item: { imageUrl: string; angle: string }) => void
}

const FORMAT_LABELS: Record<string, string> = {
  square: "1:1", story: "9:16", "4:5": "4:5",
}

export default function ResultPanel({
  phase, result, generatedImages, error, aspectRatio, showGuides,
  onRetry, onDownload, onDownloadAll,
  onSelectFromGenerated,
}: ResultPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const hasResults = generatedImages.length > 0
  const activeImg = generatedImages[activeIndex]
  const formatLabel = FORMAT_LABELS[aspectRatio] ?? aspectRatio

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, generatedImages.length - 1)))
  }, [generatedImages.length])

  const selectAt = (index: number) => {
    const image = generatedImages[index]
    if (!image) return
    setActiveIndex(index)
    onSelectFromGenerated(image, result?.copy ?? "")
  }

  const selectPrev = () => selectAt(Math.max(0, activeIndex - 1))
  const selectNext = () => selectAt(Math.min(generatedImages.length - 1, activeIndex + 1))

  return (
    <div className={styles.canvasStage}>
      {/* === PREVIEW AREA === */}
      <div className={styles.previewArea}>
        {/* --- EMPTY --- */}
        {phase === "select" && (
          <div className={styles.previewEmpty}>
            <div className={styles.formatHints} aria-hidden="true"><i /><i /><i /></div>
            {showGuides && (
              <div className={styles.guideOverlay} aria-hidden="true"><i /><b /></div>
            )}
            <div className={styles.previewIcon} aria-hidden="true">
              <span><Sparkles className="w-6 h-6 text-[#e58a68]" strokeWidth={1.5} /></span>
            </div>
            <span className={styles.previewKicker}>LISTO PARA CREAR</span>
            <h2>Tu producto está a una estrategia<br />de convertirse en anuncio.</h2>
            <p>Completa la información y Pixel IA preparará el enfoque antes de generar.</p>
            <div className={styles.progressSteps}>
              <span className={styles.done}><i>1</i> Producto</span>
              <b />
              <span><i>2</i> Estrategia</span>
              <b />
              <span><i>3</i> Creativo</span>
            </div>
          </div>
        )}

        {/* --- LOADING --- */}
        {phase === "loading" && (
          <div className={styles.generatingState} role="status" aria-live="polite">
            <div className={styles.generatingMark}>
              <img src="/pixelfm-logo.png" alt="" /><i />
            </div>
            <span className={styles.previewKicker}>PIXELFM ESTÁ CREANDO</span>
            <h2>Construyendo una dirección<br />visual para tu producto.</h2>
            <p>Pixel IA está convirtiendo tu estrategia en un creativo listo para Meta Ads.</p>
            <div className={styles.loadingTrack}><i /></div>
            <div className={styles.loadingStages}>
              <span className={styles.stageComplete}><i>✓</i> Analizando el producto</span>
              <span className={styles.stageActive}><i /> Construyendo la dirección visual</span>
              <span><i /> Generando el creativo</span>
            </div>
          </div>
        )}

        {/* --- ERROR --- */}
        {phase === "error" && (
          <div className={styles.previewEmpty}>
            <div className={styles.previewIcon} aria-hidden="true">
              <span style={{ color: "#ef4444" }}>!</span>
            </div>
            <span className={styles.previewKicker}>ERROR</span>
            <h2>No se pudo generar<br />el creativo.</h2>
            <p>{error || "Intenta de nuevo"}</p>
            <button onClick={onRetry} className="mt-6 px-5 py-2.5 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200">
              Reintentar
            </button>
          </div>
        )}

        {/* --- RESULT --- */}
        {phase === "result" && hasResults && activeImg && (
          <div className={styles.resultState}>
            <div className={styles.resultMeta}>
              <span><i /> Resultado {activeIndex + 1} de {generatedImages.length}</span>
              {generatedImages.length > 1 && <div>
                <button onClick={selectPrev} disabled={activeIndex === 0} aria-label="Creativo anterior">←</button>
                <button onClick={selectNext} disabled={activeIndex === generatedImages.length - 1} aria-label="Creativo siguiente">→</button>
              </div>}
            </div>
            <div className={styles.resultViewport}>
              <div className={styles.resultFrame} data-format={formatLabel}>
                <img src={activeImg.imageUrl} alt={`Creativo generado ${activeIndex + 1}`} />
                {showGuides && (
                  <div className={`${styles.guideOverlay} ${formatLabel === "9:16" ? styles.metaSafeGuide : ""}`} data-testid="preview-guides" aria-hidden="true"><i /><b /></div>
                )}
              </div>
            </div>
            <div className={styles.resultActions}>
              <span><b>{formatLabel}</b> · Creativo listo</span>
              <div>
                <a href={activeImg.imageUrl} target="_blank" rel="noreferrer">Ampliar</a>
                <button onClick={onDownload}>
                  Descargar <span>↓</span>
                </button>
                {generatedImages.length > 1 && <button onClick={onDownloadAll}>Descargar todos <span>↓</span></button>}
              </div>
            </div>
          </div>
        )}
      </div>

      {hasResults && phase === "result" && (
        <section className={styles.resultsStrip} aria-label="Resultados generados">
          <div className={styles.railLabel}><span>Resultados</span><small>{generatedImages.length} {generatedImages.length === 1 ? "creativo" : "creativos"} en esta sesión</small></div>
          <div className={styles.thumbnailRail}>
            {generatedImages.map((img, idx) => (
              <button key={idx} className={idx === activeIndex ? styles.thumbnailActive : ""} onClick={() => selectAt(idx)} aria-label={`Seleccionar creativo ${idx + 1}`}>
                <img src={img.imageUrl} alt="" /><span>{idx + 1}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
