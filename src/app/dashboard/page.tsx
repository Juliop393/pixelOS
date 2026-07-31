"use client"

import { useEffect, useState } from "react"
import { useCreativeGenerator } from "@/hooks/useCreativeGenerator"
import { supabase } from "@/lib/supabase"
import AngleSelector from "@/components/dashboard/AngleSelector"
import FormatSelector from "@/components/dashboard/FormatSelector"
import StyleSelector from "@/components/dashboard/StyleSelector"
import ProductForm from "@/components/dashboard/ProductForm"
import QuantitySelector from "@/components/dashboard/QuantitySelector"
import ResultPanel from "@/components/dashboard/ResultPanel"
import GenerateButton from "@/components/dashboard/GenerateButton"
import Accordion from "@/components/ui/Accordion"
import PixelAdvisor from "@/components/dashboard/PixelAdvisor"

type Tab = "product" | "angle" | "design"

export default function DashboardPage() {
  const g = useCreativeGenerator()
  const [activeTab, setActiveTab] = useState<Tab>("product")
  const [advisorToken, setAdvisorToken] = useState<string | undefined>()
  const [highlightProduct, setHighlightProduct] = useState(false)

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
    angleId: string
    styleId: string
    format: string
    safeZoneMeta: boolean
    productDescription?: string
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "product", label: "Producto" },
    { id: "angle", label: "Ángulo" },
    { id: "design", label: "Diseño" },
  ]

  return (
    <div className="flex gap-5 h-full max-w-[1600px] mx-auto relative">
      <PixelAdvisor onApplyRecommendation={handleApplyRecommendation} accessToken={advisorToken} />
      {/* COLUMNA IZQUIERDA: Panel de configuración con pestañas */}
      <aside
        className="w-[420px] flex-shrink-0 h-full flex flex-col rounded-[28px] overflow-hidden relative"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%), rgba(30,28,26,0.38)",
          backdropFilter: "blur(16px) saturate(135%)",
          WebkitBackdropFilter: "blur(16px) saturate(135%)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.22)",
        }}
      >
        {/* Reflejo superior sutil */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[35%] rounded-[28px] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
          }}
        />
        {/* Pestañas — control integrado de vidrio */}
        <div className="flex-shrink-0 p-3">
          <div
            className="flex items-center gap-1 p-1 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[#D97757]/15 text-[#D97757] shadow-sm shadow-[#D97757]/10 border border-[#D97757]/20"
                    : "text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/30 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de la pestaña activa (scroll interno) */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
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
              highlightProduct={highlightProduct}
            />
          )}

          {activeTab === "angle" && (
            <AngleSelector
              selectedAngle={g.selectedAngle}
              onSelectAngle={g.handleSelectAngle}
              loading={g.loading}
              layout="grid"
            />
          )}

          {activeTab === "design" && (
            <div className="space-y-4">
              <div className="bg-[#2A2826] rounded-xl border border-[#3A3833] p-4">
                <h3 className="text-xs font-bold text-[#F5F0E8] mb-3 uppercase tracking-wider">
                  Formato
                </h3>
                <FormatSelector aspectRatio={g.aspectRatio} setAspectRatio={g.setAspectRatio} />
                {g.aspectRatio === "story" && (
                  <div className="mt-3 pt-3 border-t border-[#3A3833]/50">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={g.safeZoneMeta}
                        onChange={(e) => g.setSafeZoneMeta(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-[#3A3833] bg-[#1E1C1A] text-[#D97757] focus:ring-[#D97757]/30 focus:ring-offset-0 cursor-pointer"
                        aria-describedby="safe-zone-desc"
                      />
                      <div>
                        <span className="text-sm font-medium text-[#F5F0E8] group-hover:text-white transition-colors">
                          Zona segura Meta
                        </span>
                        <p id="safe-zone-desc" className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">
                          Mantiene textos, logos, producto y CTA alejados de la interfaz de Stories y Reels.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-[#2A2826] rounded-xl border border-[#3A3833] p-4">
                <h3 className="text-xs font-bold text-[#F5F0E8] mb-3 uppercase tracking-wider">
                  Estilo Visual
                </h3>
                <StyleSelector visualStyle={g.visualStyle} setVisualStyle={g.setVisualStyle} />
              </div>

              <Accordion title="Ajustes Avanzados">
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

              {g.phase === "result" && (
                <button
                  onClick={g.handleClearResult}
                  className="w-full py-3 px-4 rounded-xl bg-[#1E1C1A] text-[#F5F0E8] font-semibold text-sm border border-[#3A3833] hover:border-[#D97757]/50 active:scale-[0.98] transition-all duration-200"
                >
                  Nuevo ángulo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Botón GENERAR siempre visible */}
        <div
          className="flex-shrink-0 p-4"
          style={{
            background: "rgba(255,255,255,0.025)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <GenerateButton
            onClick={g.handleGenerate}
            disabled={!canGenerate}
            loading={g.loading}
            credits={g.credits}
            cantidad={g.cantidad}
            progress={g.progress}
          />
          <p className="text-center text-[11px] text-[#9CA3AF] mt-2">
            {g.credits} crédito{g.credits === 1 ? "" : "s"} disponible{g.credits === 1 ? "" : "s"}
          </p>
        </div>
      </aside>

      {/* COLUMNA DERECHA: Preview grande */}
      <div
        className="flex-1 min-w-0 h-full overflow-y-auto rounded-[28px] relative"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%), rgba(30,28,26,0.22)",
          backdropFilter: "blur(14px) saturate(125%)",
          WebkitBackdropFilter: "blur(14px) saturate(125%)",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 24px rgba(0,0,0,0.14)",
        }}
      >
        <div className="p-5 h-full relative z-10">
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
            onSelectFromGenerated={g.handleSelectFromGenerated}
            onSelectFromHistory={g.handleSelectFromHistory}
          />
        </div>
      </div>
    </div>
  )
}