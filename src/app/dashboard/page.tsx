"use client"

import { useState } from "react"
import { useCreativeGenerator } from "@/hooks/useCreativeGenerator"
import AngleSelector from "@/components/dashboard/AngleSelector"
import FormatSelector from "@/components/dashboard/FormatSelector"
import StyleSelector from "@/components/dashboard/StyleSelector"
import ProductForm from "@/components/dashboard/ProductForm"
import QuantitySelector from "@/components/dashboard/QuantitySelector"
import ResultPanel from "@/components/dashboard/ResultPanel"
import GenerateButton from "@/components/dashboard/GenerateButton"
import Accordion from "@/components/ui/Accordion"

type Tab = "product" | "angle" | "design"

export default function DashboardPage() {
  const g = useCreativeGenerator()
  const [activeTab, setActiveTab] = useState<Tab>("product")

  const canGenerate =
    !!g.producto.trim() && !!g.selectedAngle && !g.loading && g.credits >= g.cantidad

  const tabs: { id: Tab; label: string }[] = [
    { id: "product", label: "Producto" },
    { id: "angle", label: "Ángulo" },
    { id: "design", label: "Diseño" },
  ]

  return (
    <div className="flex gap-5 h-full max-w-[1600px] mx-auto">
      {/* COLUMNA IZQUIERDA: Panel de configuración con pestañas */}
      <aside
        className="w-[420px] flex-shrink-0 h-full flex flex-col rounded-[28px] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(30,28,26,0.65) 0%, rgba(26,26,26,0.55) 100%)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Pestañas — control integrado de vidrio */}
        <div className="flex-shrink-0 p-3">
          <div
            className="flex items-center gap-1 p-1 rounded-2xl"
            style={{
              background: "rgba(30,28,26,0.5)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[#D97757] text-white shadow-sm shadow-[#D97757]/30"
                    : "text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#3A3833]/30"
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
              showQuantity={false}
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

              <div className="bg-[#2A2826] rounded-xl border border-[#3A3833] px-4 pt-1 pb-4">
                <QuantitySelector cantidad={g.cantidad} setCantidad={g.setCantidad} loading={g.loading} />
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
            background: "rgba(26,26,26,0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
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
        className="flex-1 min-w-0 h-full overflow-y-auto rounded-[28px]"
        style={{
          background: "linear-gradient(135deg, rgba(30,28,26,0.5) 0%, rgba(26,26,26,0.4) 100%)",
          backdropFilter: "blur(20px) saturate(150%)",
          WebkitBackdropFilter: "blur(20px) saturate(150%)",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        <div className="p-5 h-full">
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
    </div>
  )
}