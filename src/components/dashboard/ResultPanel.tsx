"use client"

import { ANGLES } from "@/lib/angles-data"
import SessionHistory from "./SessionHistory"

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
  onFeedback: (type: "positive" | "negative") => void
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
  onFeedback,
  onSelectFromGenerated,
  onSelectFromHistory,
}: ResultPanelProps) {
  const selectedAngleData = ANGLES.find((a) => a.id === selectedAngle)

  return (
    <div className="min-w-0">
      {phase === "select" && (
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6 lg:p-8">
          <div className="text-center max-w-md mx-auto mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-[#D97757]"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#E8E6E1] mb-2">
              Tu creativo aparecerá aquí
            </h3>
            <p className="text-[#9A9893] text-sm leading-relaxed">
              Completa tu producto, elige un ángulo de venta y genera anuncios listos para publicar. Mientras tanto, mira algunos ejemplos reales:
            </p>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-[#3A3833]" />
            <span className="text-[11px] font-semibold text-[#9A9893] uppercase tracking-wider">
              Ejemplos de creativos
            </span>
            <span className="h-px flex-1 bg-[#3A3833]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {EXAMPLE_CREATIVES.map((url, idx) => (
              <div
                key={idx}
                className="group relative aspect-square rounded-xl overflow-hidden border border-[#3A3833] bg-[#1E1C1A]"
              >
                <img
                  src={url}
                  alt={`Ejemplo de creativo ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-[#9A9893]/60 mt-3">
            Ejemplos generados con PixelOS
          </p>
        </div>
      )}

      {phase === "loading" && (
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] h-full">
          <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
            <div className="w-full max-w-sm text-center">
              <div className="relative w-20 h-20 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full border-2 border-[#D97757]/10" />
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#D97757] animate-spin"
                  style={{ animationDuration: "1.5s" }}
                />
                <div className="absolute inset-3 rounded-full bg-[#D97757]/5 flex items-center justify-center">
                  <span className="text-[#D97757] text-lg font-bold">AI</span>
                </div>
              </div>

              <p className="text-[#E8E6E1] font-medium text-lg mb-2">
                {progress.total > 1
                  ? `Generando ${progress.total} creativos...`
                  : "Generando tu creativo..."}
              </p>
              {progress.total > 1 && (
                <p className="text-[#9A9893] text-sm mb-6">
                  ({progress.completed}/{progress.total} completados)
                </p>
              )}

              <div className="w-full h-1 bg-[#3A3833] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D97757] rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: progress.total > 0
                      ? `${(progress.completed / progress.total) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="bg-[#2A2826] rounded-2xl border border-red-500/30 h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-10 h-10 text-red-400"
                width={40}
                height={40}
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-red-400 font-medium mb-2">
              Hubo un error generando tu creativo
            </p>
            <p className="text-[#9A9893]/70 text-sm mb-6">
              {error || "Intenta de nuevo"}
            </p>
            <button
              onClick={onRetry}
              className="px-6 py-3 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="space-y-4">
          {generatedImages.length > 1 && (
            <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider">
                  {generatedImages.length} creativos generados
                </p>
                <button
                  onClick={onDownloadAll}
                  className="text-xs font-medium text-[#D97757] hover:text-[#C26547] transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar todos
                </button>
              </div>
              <div className={`grid gap-2 ${
                generatedImages.length === 2 ? "grid-cols-2" :
                generatedImages.length <= 4 ? "grid-cols-2" :
                generatedImages.length <= 6 ? "grid-cols-3" :
                "grid-cols-4"
              }`}>
                {generatedImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectFromGenerated(img, result.copy)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      result.imageUrl === img.imageUrl
                        ? "border-[#D97757] ring-2 ring-[#D97757]/30"
                        : "border-[#3A3833] hover:border-[#D97757]/50"
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt={`Creativo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] overflow-hidden flex-shrink-0">
            <div className="relative bg-[#161412] flex items-center justify-center overflow-hidden p-4 min-h-[320px] max-h-[520px]">
              {result.imageUrl ? (
                <img
                  src={result.imageUrl}
                  alt="Creativo generado"
                  className="max-w-full max-h-[480px] w-auto h-auto object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#D97757]/10 border border-[#D97757]/20 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-[#D97757]"
                      width={32}
                      height={32}
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-[#9A9893] text-sm font-medium">
                    Vista previa del creativo
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#3A3833]">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">
                  {selectedAngleData?.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#E8E6E1] mb-1">
                    {selectedAngleData?.title}
                  </p>
                  <p className="text-sm text-[#9A9893] leading-relaxed">
                    {result.copy}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-4 flex-shrink-0">
            <div className="space-y-3">
              {generatedImages.length > 1 ? (
                <button
                  onClick={onDownloadAll}
                  className="w-full py-3 px-4 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar todas ({generatedImages.length})
                </button>
              ) : (
                <button
                  onClick={onDownload}
                  className="w-full py-3 px-4 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar
                </button>
              )}

              <div className="pt-2">
                <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
                  ¿Cómo quedó?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onFeedback("positive")}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#1E1C1A] text-[#E8E6E1] text-xs font-medium border border-[#3A3833] hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-200"
                  >
                    ✅ Útil
                  </button>
                  <button
                    onClick={() => onFeedback("negative")}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#1E1C1A] text-[#E8E6E1] text-xs font-medium border border-[#3A3833] hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
                  >
                    ❌ No útil
                  </button>
                </div>
              </div>
            </div>
          </div>

          <SessionHistory sessionHistory={sessionHistory} onSelect={onSelectFromHistory} />
        </div>
      )}
    </div>
  )
}