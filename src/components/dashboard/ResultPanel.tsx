"use client"

import { ANGLES } from "@/lib/angles-data"
import { Sparkles, Download, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

const EXAMPLE_CREATIVES = [
  "https://masacsnqilcqlzxhtohi.supabase.co/storage/v1/object/public/creativos/creativo_60.jpg",
  "https://masacsnqilcqlzxhtohi.supabase.co/storage/v1/object/public/creativos/creativo_66.jpg",
  "https://masacsnqilcqlzxhtohi.supabase.co/storage/v1/object/public/creativos/creativo_68.jpg",
]

interface ResultPanelProps {
  phase: "select" | "loading" | "result" | "error"
  result: { imageUrl: string; copy: string; angle: string } | null
  generatedImages: Array<{ imageUrl: string; angle: string }>
  progress: { completed: number; total: number }
  error: string | null
  aspectRatio: string
  selectedAngle: string | null
  sessionHistory: Array<{ imageUrl: string; angle: string }>
  onRetry: () => void
  onDownload: () => void
  onDownloadAll: () => void
  onSelectFromGenerated: (img: { imageUrl: string; angle: string }, copy: string) => void
  onSelectFromHistory: (item: { imageUrl: string; angle: string }) => void
}

export default function ResultPanel({
  phase,
  result,
  generatedImages,
  progress,
  error,
  aspectRatio,
  selectedAngle,
  sessionHistory,
  onRetry,
  onDownload,
  onDownloadAll,
  onSelectFromGenerated,
  onSelectFromHistory,
}: ResultPanelProps) {
  const selectedAngleData = ANGLES.find((a) => a.id === selectedAngle)
  const allThumbs = [...generatedImages, ...sessionHistory]

  return (
    <div className="min-w-0 h-full flex flex-col gap-3">
      {/* === MAIN STAGE === */}
      <div
        className="flex-1 rounded-[24px] overflow-hidden relative min-h-0"
        style={{
          background: "linear-gradient(160deg, rgba(22,20,18,0.6) 0%, rgba(14,13,13,0.5) 100%)",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Reflejo superior */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[25%] pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)" }}
        />

        {/* --- EMPTY STATE --- */}
        {phase === "select" && (
          <div className="h-full flex flex-col items-center justify-center px-6 py-8 relative z-10">
            <div
              className="text-center max-w-sm mb-6 px-8 py-8 rounded-3xl"
              style={{
                background: "linear-gradient(135deg, rgba(42,40,38,0.45) 0%, rgba(30,28,26,0.3) 100%)",
                border: "1px solid rgba(217,119,87,0.1)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(217,119,87,0.12) 0%, rgba(217,119,87,0.04) 100%)",
                  border: "1px solid rgba(217,119,87,0.12)",
                }}
              >
                <Sparkles className="w-6 h-6 text-[#D97757]" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#F5F0E8] mb-2">
                Tu creativo aparecerá aquí
              </h3>
              <p className="text-[#9CA3AF] text-sm leading-relaxed">
                Completa tu producto, elige un ángulo de venta y genera anuncios listos para publicar.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-[#3A3833]/30" />
                <span className="text-[10px] font-semibold text-[#9CA3AF]/50 uppercase tracking-wider">
                  Inspiración
                </span>
                <span className="h-px flex-1 bg-[#3A3833]/30" />
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 dashboard-scroll">
                {EXAMPLE_CREATIVES.map((url, idx) => (
                  <div
                    key={idx}
                    className="group relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(58,56,51,0.35)" }}
                  >
                    <img
                      src={url}
                      alt={`Ejemplo ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- LOADING STATE --- */}
        {phase === "loading" && (
          <div className="h-full flex flex-col items-center justify-center relative z-10">
            <div className="w-full max-w-sm text-center">
              <div
                className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center relative"
                style={{
                  background: "linear-gradient(135deg, rgba(217,119,87,0.12) 0%, rgba(217,119,87,0.04) 100%)",
                  border: "1px solid rgba(217,119,87,0.15)",
                }}
              >
                <Sparkles className="w-9 h-9 text-[#D97757] animate-pulse" strokeWidth={1.5} />
                <div
                  className="absolute -inset-1 rounded-2xl opacity-60"
                  style={{
                    background: "conic-gradient(from 0deg, transparent, rgba(217,119,87,0.15), transparent)",
                    animation: "spin 2s linear infinite",
                  }}
                />
              </div>

              <p className="text-[#F5F0E8] font-semibold text-base mb-1.5">
                {progress.total > 1
                  ? `Generando ${progress.total} creativos`
                  : "Pixel IA está trabajando"}
              </p>
              <p className="text-[#9CA3AF] text-xs mb-6">
                {progress.total > 1
                  ? `${progress.completed} de ${progress.total} completados`
                  : "Creando tu anuncio..."}
              </p>

              <div className="w-full h-[3px] bg-[#3A3833]/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D97757] rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: progress.total > 0
                      ? `${(progress.completed / progress.total) * 100}%`
                      : "0%",
                    boxShadow: "0 0 8px rgba(217,119,87,0.4)",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* --- ERROR STATE --- */}
        {phase === "error" && (
          <div className="h-full flex items-center justify-center relative z-10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/8 border border-red-500/15 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-red-400" width={32} height={32} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-[#F5F0E8] font-medium mb-1.5">Hubo un error generando tu creativo</p>
              <p className="text-[#9CA3AF]/60 text-xs mb-6 max-w-xs mx-auto">{error || "Intenta de nuevo"}</p>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* --- RESULT STATE --- */}
        {phase === "result" && result && (
          <div className="h-full flex flex-col relative z-10">
            {/* Preview principal */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-6 min-h-0">
              {result.imageUrl ? (
                <>
                  <img
                    src={result.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "blur(45px) brightness(0.2) saturate(0.4)", transform: "scale(1.2)" }}
                  />
                  <div className="absolute inset-0 bg-[#0c0b0a]/65" />
                  <img
                    src={result.imageUrl}
                    alt="Creativo generado"
                    className="relative z-10 max-w-[88%] max-h-full w-auto h-auto object-contain rounded-xl"
                    style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)" }}
                  />
                </>
              ) : (
                <div className="text-center">
                  <p className="text-[#9CA3AF] text-sm">Vista previa del creativo</p>
                </div>
              )}
            </div>

            {/* Angle + Copy footer */}
            {selectedAngleData && (
              <div className="px-5 py-3.5 flex items-start gap-2.5" style={{ borderTop: "1px solid rgba(58,56,51,0.4)" }}>
                <span className="text-base mt-0.5">{selectedAngleData.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#F5F0E8] mb-0.5">{selectedAngleData.title}</p>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed line-clamp-2">{result.copy}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* === BOTTOM STRIP: Thumbs + Download === */}
      {phase === "result" && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Thumbnails strip */}
          {allThumbs.length > 1 && (
            <div
              className="flex-1 rounded-2xl p-2.5 overflow-hidden"
              style={{
                background: "rgba(42,40,38,0.35)",
                border: "1px solid rgba(58,56,51,0.4)",
              }}
            >
              <div className="flex gap-2 overflow-x-auto dashboard-scroll">
                {allThumbs.map((img, idx) => {
                  const isActive = result?.imageUrl === img.imageUrl
                  const fromHistory = idx >= generatedImages.length
                  return (
                    <button
                      key={`${img.imageUrl}-${idx}`}
                      onClick={() => fromHistory ? onSelectFromHistory(img) : onSelectFromGenerated(img, result?.copy || "")}
                      className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border transition-all duration-200 ${
                        isActive
                          ? "border-[#D97757] ring-1 ring-[#D97757]/30"
                          : "border-[#3A3833] hover:border-[#D97757]/40"
                      }`}
                    >
                      <img src={img.imageUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={generatedImages.length > 1 ? onDownloadAll : onDownload}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 flex-shrink-0"
            style={{ boxShadow: "0 4px 16px rgba(217,119,87,0.2)" }}
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            {generatedImages.length > 1 ? `Descargar (${generatedImages.length})` : "Descargar"}
          </button>
        </div>
      )}

      {/* === EMPTY STATE STRIP: Inspiration === */}
      {phase === "select" && (
        <div
          className="flex-1 flex flex-col justify-end rounded-[24px] overflow-hidden relative min-h-0 hidden"
          style={{
            background: "linear-gradient(160deg, rgba(22,20,18,0.6) 0%, rgba(14,13,13,0.5) 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        />
      )}
    </div>
  )
}