"use client"

import { useEffect, useMemo, useState } from "react"
import { Sparkles } from "lucide-react"
import { useCreativeGenerator } from "@/hooks/useCreativeGenerator"
import { supabase } from "@/lib/supabase"
import { ANGLES } from "@/lib/angles-data"
import AngleSelector from "@/components/dashboard/AngleSelector"
import FormatSelector from "@/components/dashboard/FormatSelector"
import StyleSelector from "@/components/dashboard/StyleSelector"
import ProductForm from "@/components/dashboard/ProductForm"
import QuantitySelector from "@/components/dashboard/QuantitySelector"
import ResultPanel from "@/components/dashboard/ResultPanel"
import Accordion from "@/components/ui/Accordion"
import PixelAdvisor from "@/components/dashboard/PixelAdvisor"
import s from "@/components/dashboard/GeneratorWorkspace.module.css"

const FORMAT_LABELS: Record<string, string> = {
  square: "1:1", story: "9:16", "4:5": "4:5",
}

const FORMAT_OPTIONS = [
  { id: "square", label: "1:1", description: "Feed" },
  { id: "4:5", label: "4:5", description: "Feed vertical" },
  { id: "story", label: "9:16", description: "Stories y Reels" },
]

type Tab = "product" | "angle" | "design"

export default function DashboardPage() {
  const g = useCreativeGenerator()
  const [activeTab, setActiveTab] = useState<Tab>("product")
  const [advisorToken, setAdvisorToken] = useState<string | undefined>()
  const [highlightProduct, setHighlightProduct] = useState(false)
  const [showGuides, setShowGuides] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [advisorOpen, setAdvisorOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdvisorToken(session?.access_token)
    })
  }, [])

  useEffect(() => {
    if (highlightProduct) {
      const timer = setTimeout(() => setHighlightProduct(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightProduct])

  const handleApplyRecommendation = (rec: {
    angleId: string; styleId: string; format: string; safeZoneMeta: boolean; productDescription?: string
  }) => {
    g.handleSelectAngle(rec.angleId)
    g.setAspectRatio(rec.format)
    g.setVisualStyle(rec.styleId)
    g.setSafeZoneMeta(rec.safeZoneMeta)
    if (rec.productDescription) {
      const current = g.producto.trim()
      if (!current || current.length < 30) {
        g.setProducto(rec.productDescription)
        setActiveTab("product")
        setHighlightProduct(true)
      }
    }
  }

  const canGenerate =
    !!g.producto.trim() && !!g.selectedAngle && !g.loading && g.credits >= g.cantidad

  const selectedAngleLabel = useMemo(
    () => ANGLES.find((angle) => angle.id === g.selectedAngle)?.title ?? "Sin seleccionar",
    [g.selectedAngle],
  )

  const selectFormat = (format: string) => {
    g.setAspectRatio(format)
    setFormatOpen(false)
  }

  const summaryStatus = g.loading
    ? "Generando"
    : g.phase === "error"
      ? "Requiere atención"
      : g.phase === "result"
        ? "Creativo generado"
        : !g.producto.trim()
          ? "Completa el producto"
          : !g.selectedAngle
            ? "Selecciona un ángulo"
            : "Listo para generar"

  const tabs: { id: Tab; label: string }[] = [
    { id: "product", label: "Producto" },
    { id: "angle", label: "Ángulo" },
    { id: "design", label: "Diseño" },
  ]

  return (
    <div id="generator-root" className={s.generatorPage}>
      <div className={s.ambient} aria-hidden="true"><i /><i /></div>

      <section className={s.workspace}>
      {/* ===== LEFT PANEL ===== */}
      <aside className={s.builderPanel}>
        <div className={s.panelIntro}>
          <span className={s.eyebrow}>NUEVO CREATIVO</span>
          <h1>Construye tu anuncio</h1>
          <p>Define el producto y deja que Pixel IA ordene el resto.</p>
        </div>

        <div className={s.stepTabs} role="tablist" aria-label="Pasos del generador">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? s.stepActive : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>0{tabs.indexOf(tab) + 1}</span>{tab.label}
            </button>
          ))}
        </div>

        <div className={s.formScroll}>
          {activeTab === "product" && (
            <ProductForm
              producto={g.producto}
              setProducto={g.setProducto}
              titulo={g.titulo}
              setTitulo={g.setTitulo}
              subtitulo={g.subtitulo}
              setSubtitulo={g.setSubtitulo}
              ctaContacto={g.ctaContacto}
              setCtaContacto={g.setCtaContacto}
              cantidad={g.cantidad}
              setCantidad={g.setCantidad}
              loading={g.loading}
              imagenReferencia={g.imagenReferencia}
              setImagenReferencia={g.setImagenReferencia}
              nombreImagenReferencia={g.nombreImagenReferencia}
              setNombreImagenReferencia={g.setNombreImagenReferencia}
              showQuantity={false}
              highlightProduct={highlightProduct}
            />
          )}

          {activeTab === "angle" && (
            <section className={s.formCard}>
              <div className={s.formHeading}>
                <span>02</span>
                <div><h2>Estrategia</h2><p>Elige el enfoque persuasivo de tu anuncio.</p></div>
              </div>
              <AngleSelector
                selectedAngle={g.selectedAngle}
                onSelectAngle={g.handleSelectAngle}
                loading={g.loading}
                layout="grid"
              />
            </section>
          )}

          {activeTab === "design" && (
            <div className="flex flex-col gap-3">
              <section className={s.formCard}>
                <div className={s.formHeading}>
                  <span>03</span>
                  <div><h2>Formato</h2><p>Elige la proporción de tu anuncio.</p></div>
                </div>
                <FormatSelector aspectRatio={g.aspectRatio} setAspectRatio={g.setAspectRatio} />
                {g.aspectRatio === "story" && (
                  <button className={s.toggleRow} onClick={() => g.setSafeZoneMeta(!g.safeZoneMeta)} aria-pressed={g.safeZoneMeta} style={{ marginTop: 14 }}>
                    <span><b>Zona Segura Meta</b><small>Protege textos y CTA en Stories y Reels.</small></span>
                    <i className={g.safeZoneMeta ? s.toggleOn : ""}><em /></i>
                  </button>
                )}
              </section>

              <section className={s.formCard}>
                <div className={s.formHeading}>
                  <span>04</span>
                  <div><h2>Cantidad</h2><p>¿Cuántas versiones necesitas?</p></div>
                </div>
                <QuantitySelector cantidad={g.cantidad} setCantidad={g.setCantidad} loading={g.loading} />
              </section>

              <section className={s.formCard}>
                <div className={s.formHeading}>
                  <span>05</span>
                  <div><h2>Estilo visual</h2><p>Define la estética que acompañará tu mensaje.</p></div>
                </div>
                <StyleSelector visualStyle={g.visualStyle} setVisualStyle={g.setVisualStyle} />
              </section>

              <section className={s.formCard}>
                <div className={s.formHeading}>
                  <span>06</span>
                  <div><h2>Ajustes</h2><p>Configuración adicional.</p></div>
                </div>
                <Accordion title="Color de marca">
                  <label className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                    Color de Marca (Opcional)
                  </label>
                  <input
                    type="text"
                    value={g.brandColor}
                    onChange={(e) => g.setBrandColor(e.target.value)}
                    placeholder="Ej: #D97757"
                    className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2 rounded-lg text-sm text-[#F5F0E8] placeholder:text-[#9CA3AF]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
                  />
                </Accordion>
              </section>
            </div>
          )}
        </div>

        <div className={s.generateDock}>
          <button
            className={s.generateButton}
            onClick={g.handleGenerate}
            disabled={!canGenerate}
          >
            <span>✦</span>
            {g.loading
              ? `Generando (${g.progress.completed}/${g.progress.total})...`
              : `Generar ${g.cantidad > 1 ? `${g.cantidad} creativos` : "creativo"}`}
            <b>→</b>
          </button>
          <div>
            <span>{g.cantidad} {g.cantidad === 1 ? "crédito" : "créditos"} · {g.cantidad} {g.cantidad === 1 ? "creativo" : "creativos"}</span>
            <span>{g.credits} disponible{g.credits === 1 ? "" : "s"}</span>
          </div>
        </div>
      </aside>

      {/* ===== RIGHT PANEL ===== */}
      <div className={s.previewColumn}>
      <section className={`${s.canvasPanel} ${isFullscreen ? s.canvasFullscreen : ""}`} data-testid="canvas-panel" data-format={FORMAT_LABELS[g.aspectRatio] ?? g.aspectRatio}>
        <div className={s.canvasHeader}>
          <div>
            <span className={s.liveDot} />
            <div><b>Vista previa</b><small>Tu creativo se actualizará aquí</small></div>
          </div>
          <div className={s.canvasTools}>
            <div className={s.formatMenu}>
              <button className={s.formatBtn} onClick={() => setFormatOpen(!formatOpen)} aria-expanded={formatOpen} aria-haspopup="menu">
                {FORMAT_LABELS[g.aspectRatio] ?? g.aspectRatio} <span>⌄</span>
              </button>
              {formatOpen && (
                <div role="menu">
                  {FORMAT_OPTIONS.map((option) => (
                    <button key={option.id} role="menuitem" className={g.aspectRatio === option.id ? s.activeFormat : ""} onClick={() => selectFormat(option.id)}>
                      <span>{option.label}</span><small>{option.description}</small><b>{g.aspectRatio === option.id ? "✓" : ""}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={showGuides ? s.toolActive : ""}
              onClick={() => setShowGuides(!showGuides)}
              aria-label={showGuides ? "Ocultar guías" : "Mostrar guías"}
              aria-pressed={showGuides}
            >⌗</button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={isFullscreen ? "Salir de pantalla completa" : "Expandir vista"}
              aria-pressed={isFullscreen}
            >⛶</button>
          </div>
        </div>

        <ResultPanel
          phase={g.phase}
          result={g.result}
          generatedImages={g.generatedImages}
          progress={g.progress}
          error={g.error}
          aspectRatio={g.aspectRatio}
          selectedAngle={g.selectedAngle}
          sessionHistory={g.sessionHistory}
          showGuides={showGuides}
          credits={g.credits}
          cantidad={g.cantidad}
          safeZoneMeta={g.safeZoneMeta}
          onRetry={g.handleRetry}
          onDownload={g.handleDownload}
          onDownloadAll={g.handleDownloadAll}
          onSelectFromGenerated={g.handleSelectFromGenerated}
          onSelectFromHistory={g.handleSelectFromHistory}
        />
      </section>

      <section className={s.contextRail} aria-label="Resumen del creativo">
        <div className={s.railLabel}><span>Resumen del creativo</span><small>Configuración actual de la generación</small></div>
        <div className={s.summaryGrid}>
          <span><small>Ángulo</small><b>{selectedAngleLabel}</b></span>
          <span><small>Formato</small><b>{FORMAT_LABELS[g.aspectRatio] ?? g.aspectRatio}</b></span>
          <span><small>Cantidad</small><b>{g.cantidad} {g.cantidad === 1 ? "creativo" : "creativos"}</b></span>
          <span><small>Zona Segura</small><b>{g.safeZoneMeta ? "Activada" : "Desactivada"}</b></span>
          <span className={s.summaryStatus}><small>Estado</small><b><i />{summaryStatus}</b></span>
        </div>
      </section>
      </div>

      <aside className={`${s.aiCard} ${s.builderAiCard} ${advisorOpen ? s.aiCardActive : ""}`}>
        <div className={s.aiHead}>
          <span><Sparkles className="w-4 h-4" strokeWidth={1.5} /></span>
          <div><b>Pixel IA</b><small>Asistente estratégico</small></div><i />
        </div>
        <p>Piensa la estrategia antes de generar y recomienda el mejor ángulo.</p>
        <button onClick={() => setAdvisorOpen(true)} aria-expanded={advisorOpen} aria-controls="pixel-ai-panel">
          {advisorOpen ? "Pixel IA abierta" : "Iniciar con Pixel IA"} <span>→</span>
        </button>
      </aside>

      <PixelAdvisor
        onApplyRecommendation={handleApplyRecommendation}
        accessToken={advisorToken}
        hideBubble
        inline
        open={advisorOpen}
        onOpenChange={setAdvisorOpen}
      />
      </section>
    </div>
  )
}
