"use client"

import { useCreativeGenerator } from "@/hooks/useCreativeGenerator"
import AngleSelector from "@/components/dashboard/AngleSelector"
import FormatSelector from "@/components/dashboard/FormatSelector"
import StyleSelector from "@/components/dashboard/StyleSelector"
import ProductForm from "@/components/dashboard/ProductForm"
import ResultPanel from "@/components/dashboard/ResultPanel"
import GenerateButton from "@/components/dashboard/GenerateButton"
import Accordion from "@/components/ui/Accordion"

export default function DashboardPage() {
  const g = useCreativeGenerator()

  const canGenerate =
    !!g.producto.trim() && !!g.selectedAngle && !g.loading && g.credits >= g.cantidad

  return (
    <div className="flex gap-5 h-full">
      {/* SIDEBAR IZQUIERDA: Configuración (fija, scroll interno, botón sticky) */}
      <aside className="w-[300px] flex-shrink-0 h-full flex flex-col rounded-2xl border border-[#3A3833] bg-[#1E1C1A] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          />

          <div className="bg-[#2A2826] rounded-xl border border-[#3A3833] p-4">
            <h3 className="text-xs font-bold text-[#E8E6E1] mb-3 uppercase tracking-wider">
              Formato
            </h3>
            <FormatSelector aspectRatio={g.aspectRatio} setAspectRatio={g.setAspectRatio} />
          </div>

          <div className="bg-[#2A2826] rounded-xl border border-[#3A3833] p-4">
            <h3 className="text-xs font-bold text-[#E8E6E1] mb-3 uppercase tracking-wider">
              Estilo Visual
            </h3>
            <StyleSelector visualStyle={g.visualStyle} setVisualStyle={g.setVisualStyle} />
          </div>

          <Accordion title="Ajustes Avanzados">
            <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
              Color de Marca (Opcional)
            </label>
            <input
              type="text"
              value={g.brandColor}
              onChange={(e) => g.setBrandColor(e.target.value)}
              placeholder="Ej: #D97757"
              className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
            />
          </Accordion>

          {g.phase === "result" && (
            <button
              onClick={g.handleClearResult}
              className="w-full py-3 px-4 rounded-xl bg-[#1E1C1A] text-[#E8E6E1] font-semibold text-sm border border-[#3A3833] hover:border-[#D97757]/50 active:scale-[0.98] transition-all duration-200"
            >
              Nuevo ángulo
            </button>
          )}

          {/* Botón GENERAR sticky — visible incluso al scrollear el formulario */}
          <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 px-4 pb-4 pt-6 bg-gradient-to-t from-[#1E1C1A] via-[#1E1C1A] to-transparent z-10">
            <GenerateButton
              onClick={g.handleGenerate}
              disabled={!canGenerate}
              loading={g.loading}
              credits={g.credits}
              cantidad={g.cantidad}
              progress={g.progress}
            />
            <p className="text-center text-[11px] text-[#9A9893] mt-2">
              {g.credits} crédito{g.credits === 1 ? "" : "s"} disponible{g.credits === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL: Ángulos arriba + Resultado abajo */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1 -mr-1 space-y-5">
        {/* Grid 2x3 de ángulos */}
        <AngleSelector
          selectedAngle={g.selectedAngle}
          onSelectAngle={g.handleSelectAngle}
          loading={g.loading}
        />

        {/* Panel de resultado */}
        <ResultPanel
          phase={g.phase}
          result={g.result}
          generatedImages={g.generatedImages}
          progress={g.progress}
          error={g.error}
          aspectRatio={g.aspectRatio}
          selectedAngle={g.selectedAngle}
          sessionHistory={g.sessionHistory}
          onRetry={g.handleRetry}
          onDownload={g.handleDownload}
          onDownloadAll={g.handleDownloadAll}
          onFeedback={g.handleFeedback}
          onSelectFromGenerated={g.handleSelectFromGenerated}
          onSelectFromHistory={g.handleSelectFromHistory}
        />
      </div>
    </div>
  )
}