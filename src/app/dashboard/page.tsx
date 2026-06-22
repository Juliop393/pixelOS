"use client"

import { useCreativeGenerator } from "@/hooks/useCreativeGenerator"
import AngleSelector from "@/components/dashboard/AngleSelector"
import FormatSelector from "@/components/dashboard/FormatSelector"
import StyleSelector from "@/components/dashboard/StyleSelector"
import ProductForm from "@/components/dashboard/ProductForm"
import ResultPanel from "@/components/dashboard/ResultPanel"
import Accordion from "@/components/ui/Accordion"

export default function DashboardPage() {
  const g = useCreativeGenerator()

  return (
    <div className="flex gap-6 h-full">
      {/* COLUMNA 1: Parámetros */}
      <div className="w-[320px] flex-shrink-0 space-y-6">
        <ProductForm
          producto={g.producto}
          setProducto={g.setProducto}
          textoAnuncio={g.textoAnuncio}
          setTextoAnuncio={g.setTextoAnuncio}
          ctaContacto={g.ctaContacto}
          setCtaContacto={g.setCtaContacto}
          cantidad={g.cantidad}
          setCantidad={g.setCantidad}
          loading={g.loading}
          onGenerate={g.handleGenerate}
          canGenerate={!!g.producto.trim() && !!g.selectedAngle && !g.loading && g.credits >= g.cantidad}
          credits={g.credits}
          progress={g.progress}
        />

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
          <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
            Formato
          </h3>
          <FormatSelector aspectRatio={g.aspectRatio} setAspectRatio={g.setAspectRatio} />
        </div>

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
          <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
            Estilo Visual
          </h3>
          <StyleSelector visualStyle={g.visualStyle} setVisualStyle={g.setVisualStyle} />
        </div>

        <Accordion title="Ajustes Avanzados">
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
            Color Principal de la Marca (Opcional)
          </label>
          <input
            type="text"
            value={g.brandColor}
            onChange={(e) => g.setBrandColor(e.target.value)}
            placeholder="Ej: #D97757"
            className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2.5 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
          />
        </Accordion>

        {g.phase === "result" && (
          <button
            onClick={g.handleClearResult}
            className="w-full py-3.5 px-6 rounded-xl bg-[#1E1C1A] text-[#E8E6E1] font-semibold text-sm border border-[#3A3833] hover:border-[#D97757]/50 active:scale-[0.98] transition-all duration-200"
          >
            Nuevo ángulo
          </button>
        )}
      </div>

      {/* COLUMNA 2: Ángulos de Venta */}
      <div className="w-[380px] flex-shrink-0">
        <AngleSelector
          selectedAngle={g.selectedAngle}
          onSelectAngle={g.handleSelectAngle}
          loading={g.loading}
        />
      </div>

      {/* COLUMNA 3: Lienzo / Resultados */}
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
  )
}