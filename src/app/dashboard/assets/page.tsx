"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Check, Download, Film, Image as ImageIcon, Loader2, Play } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Asset = {
  id: string
  media_type: "image" | "video"
  kind: "scene" | "final" | null
  public_url: string | null
  title: string | null
  format: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
type MediaTab = "image" | "video"

const ANGLE_NAMES: Record<string, string> = {
  comparison: "Contraste competitivo",
  "problem-solution": "Problema y solución",
  "primary-benefit": "Beneficio principal",
  "social-proof": "Prueba social",
  "product-demo": "Demostración del producto",
  "usage-experience": "Experiencia de uso",
  "offer-convenience": "Oferta y conveniencia",
  "unique-mechanism": "Mecanismo único",
}

const FORMAT_NAMES: Record<string, string> = {
  square: "1:1",
  story: "9:16",
  "4:5": "4:5",
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function VideoCard({ asset, selectionMode, selectionOrder, selectionDisabled, onToggle }: {
  asset: Asset
  selectionMode: boolean
  selectionOrder: number
  selectionDisabled: boolean
  onToggle: () => void
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const isFinal = asset.kind === "final"

  const openVideo = async () => {
    if (loading) return
    setLoading(true)
    setError("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")
      const response = await fetch(`/api/assets/video-url?assetId=${encodeURIComponent(asset.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok || typeof data !== "object" || data === null ||
          !("videoUrl" in data) || typeof data.videoUrl !== "string" || !data.videoUrl.startsWith("https://") ||
          !("downloadUrl" in data) || typeof data.downloadUrl !== "string" || !data.downloadUrl.startsWith("https://")) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error : "No se pudo abrir el video"
        throw new Error(message)
      }
      setVideoUrl(data.videoUrl)
      setDownloadUrl(data.downloadUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el video")
    } finally {
      setLoading(false)
    }
  }

  return <article className={`bg-[#2A2826] rounded-2xl border overflow-hidden ${selectionOrder ? "border-[#D97757]" : "border-[#3A3833]"}`}>
    <div className="aspect-square bg-[#11100F] relative flex items-center justify-center">
      {selectionMode && <button type="button" onClick={onToggle} disabled={selectionDisabled} aria-pressed={selectionOrder > 0} aria-label={selectionOrder ? `Quitar video ${selectionOrder} de la selección` : "Seleccionar video"} className={`absolute right-3 top-3 z-10 flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-lg transition-colors ${selectionOrder ? "border-[#D97757] bg-[#D97757] text-white" : "border-[#6A625C] bg-[#1E1C1A] text-[#E8E6E1] hover:border-[#D97757]"} disabled:opacity-50`}>{selectionOrder ? <><Check className="h-4 w-4" />#{selectionOrder}</> : "Seleccionar"}</button>}
      {videoUrl ? <video className="w-full h-full object-contain" src={videoUrl} controls playsInline preload="metadata" aria-label={isFinal ? "Video final" : "Video de escena"} onError={() => { setVideoUrl(null); setDownloadUrl(null); setError("No se pudo reproducir el video. Actualiza el enlace e inténtalo de nuevo.") }} /> : <>
        <Film className="w-10 h-10 text-[#D97757]/60" aria-hidden="true" />
        <button type="button" onClick={() => { void openVideo() }} disabled={loading} className="absolute bottom-4 left-4 right-4 min-h-10 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? "Preparando video…" : "Ver video"}
        </button>
      </>}
    </div>
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-block px-2 py-1 rounded-md text-[11px] font-semibold bg-[#D97757]/15 text-[#E49A7D] border border-[#D97757]/25">
          {isFinal ? "Video final" : "Escena"}
        </span>
        <span className="text-xs text-[#9A9893]">{formatDate(asset.created_at)}</span>
      </div>
      <p className="text-sm font-semibold text-[#E8E6E1] truncate">{asset.title || (isFinal ? "Anuncio final" : "Clip de escena")}</p>
      {asset.format && <p className="text-xs text-[#9A9893]">{FORMAT_NAMES[asset.format] || asset.format}</p>}
      {downloadUrl && <div className="flex items-center justify-between gap-3"><a href={downloadUrl} download={isFinal ? "pixelfm-final.mp4" : "pixelfm-escena.mp4"} className="text-sm text-[#E49A7D] hover:text-[#F4B297] inline-flex items-center gap-2"><Download className="w-4 h-4" />Descargar</a><button type="button" onClick={() => { void openVideo() }} disabled={loading} className="text-xs text-[#9A9893] hover:text-[#E8E6E1]">Actualizar enlace</button></div>}
      {error && <p role="alert" className="text-xs text-[#E7A59D]">{error}</p>}
    </div>
  </article>
}

export default function MisCreativosPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [tab, setTab] = useState<MediaTab>("image")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([])
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState("")
  const mergeInFlight = useRef(false)

  useEffect(() => {
    let active = true
    const loadAssets = async () => {
      setLoading(true)
      setError("")
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")
        // RLS limits this authenticated SELECT to the user's own rows.
        const { data, error: queryError } = await supabase.from("creative_assets")
          .select("id,media_type,kind,public_url,title,format,metadata,created_at")
          .order("created_at", { ascending: false })
        if (queryError) throw new Error("No se pudo cargar tu biblioteca")
        if (active) setAssets((data ?? []) as Asset[])
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar tu biblioteca")
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadAssets()
    return () => { active = false }
  }, [reload])

  const visibleAssets = assets.filter((asset) => asset.media_type === tab)
  const imageCount = assets.filter((asset) => asset.media_type === "image").length
  const videoCount = assets.filter((asset) => asset.media_type === "video").length
  const selectedVideos = selectedVideoIds.map((id) => assets.find((asset) => asset.id === id)).filter((asset): asset is Asset => Boolean(asset))

  const toggleVideo = (id: string) => {
    if (mergeInFlight.current) return
    setMergeError("")
    setSelectedVideoIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 10 ? [...current, id] : current)
  }

  const moveVideo = (index: number, direction: -1 | 1) => {
    if (mergeInFlight.current) return
    setSelectedVideoIds((current) => {
      const destination = index + direction
      if (destination < 0 || destination >= current.length) return current
      const next = [...current]
      ;[next[index], next[destination]] = [next[destination], next[index]]
      return next
    })
  }

  const combineVideos = async () => {
    if (mergeInFlight.current || selectedVideoIds.length < 2 || selectedVideoIds.length > 10) return
    mergeInFlight.current = true
    setMerging(true)
    setMergeError("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")
      const response = await fetch("/api/video/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ assetIds: selectedVideoIds }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok || typeof result !== "object" || result === null || !("success" in result) || result.success !== true || !("assetId" in result) || typeof result.assetId !== "string") {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error : "No se pudieron combinar los videos. Inténtalo de nuevo."
        throw new Error(message)
      }
      setSelectedVideoIds([])
      setSelectionMode(false)
      setReload((value) => value + 1)
    } catch (cause) {
      setMergeError(cause instanceof Error ? cause.message : "No se pudieron combinar los videos.")
    } finally {
      mergeInFlight.current = false
      setMerging(false)
    }
  }

  const handleImageDownload = (imageUrl: string, id: string) => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `creativo-${id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return <div id="dashboard-assets" className="mx-auto w-full max-w-6xl pb-10">
    <div className="mb-7">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Mis creativos</h1>
      <p className="text-[#9A9893]">Tus imágenes y videos, reunidos en un solo lugar.</p>
    </div>

    <div role="group" aria-label="Tipo de creativo" className="mb-8 inline-flex gap-1 rounded-xl border border-[#3A3833] bg-[#1E1C1A] p-1">
      <button type="button" aria-pressed={tab === "image"} disabled={merging} onClick={() => { setTab("image"); setSelectionMode(false); setSelectedVideoIds([]); setMergeError("") }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === "image" ? "bg-[#D97757] text-white" : "text-[#AFA9A1] hover:text-[#E8E6E1] hover:bg-[#2A2826]"}`}>Imágenes <span className="opacity-70">{imageCount}</span></button>
      <button type="button" aria-pressed={tab === "video"} disabled={merging} onClick={() => setTab("video")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === "video" ? "bg-[#D97757] text-white" : "text-[#AFA9A1] hover:text-[#E8E6E1] hover:bg-[#2A2826]"}`}>Videos <span className="opacity-70">{videoCount}</span></button>
    </div>

    {tab === "video" && !loading && !error && <div className="mb-6 rounded-2xl border border-[#3A3833] bg-[#1E1C1A] p-4">
      {!selectionMode ? <button type="button" disabled={videoCount === 0} onClick={() => { setSelectionMode(true); setMergeError("") }} className="rounded-xl border border-[#66534A] px-4 py-2 text-sm font-semibold text-[#E8E6E1] transition-colors hover:border-[#D97757] disabled:opacity-50">Seleccionar</button> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm font-semibold text-[#E8E6E1]">{selectedVideoIds.length} {selectedVideoIds.length === 1 ? "seleccionado" : "seleccionados"} <span className="font-normal text-[#9A9893]">· máximo 10</span></p>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={merging} onClick={() => { setSelectionMode(false); setSelectedVideoIds([]); setMergeError("") }} className="rounded-xl border border-[#4A4540] px-4 py-2 text-sm text-[#B7AAA0] hover:text-[#E8E6E1] disabled:opacity-50">Cancelar</button><button type="button" disabled={merging || selectedVideoIds.length < 2} onClick={() => { void combineVideos() }} className="inline-flex items-center gap-2 rounded-xl bg-[#D97757] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C26547] disabled:opacity-50">{merging && <Loader2 className="h-4 w-4 animate-spin" />}{merging ? "Combinando..." : "Combinar videos"}</button></div>
        </div>
        {selectedVideos.length > 0 && <ol aria-label="Orden de combinación" className="mt-4 flex flex-col gap-2">{selectedVideos.map((asset, index) => <li key={asset.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#3A3833] bg-[#25211E] px-3 py-2"><span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#D97757]/20 text-xs font-bold text-[#E49A7D]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-[#E8E6E1]">{asset.title || (asset.kind === "final" ? "Anuncio final" : "Clip de escena")}</span><span className="hidden text-xs text-[#9A9893] sm:inline">{asset.kind === "final" ? "Final" : "Escena"}</span><button type="button" disabled={merging || index === 0} onClick={() => moveVideo(index, -1)} aria-label={`Subir video ${index + 1}`} className="rounded-lg border border-[#4A4540] p-2 text-[#B7AAA0] hover:text-[#E8E6E1] disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={merging || index === selectedVideos.length - 1} onClick={() => moveVideo(index, 1)} aria-label={`Bajar video ${index + 1}`} className="rounded-lg border border-[#4A4540] p-2 text-[#B7AAA0] hover:text-[#E8E6E1] disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button></li>)}</ol>}
        {mergeError && <p role="alert" className="mt-3 text-sm text-[#E7A59D]">{mergeError}</p>}
      </>}
    </div>}

    <section id="assets-panel" aria-live="polite" aria-busy={loading}>
      {loading ? <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex items-center justify-center gap-3 text-[#B7AAA0]"><Loader2 className="w-5 h-5 animate-spin" />Cargando tus creativos…</div>
        : error ? <div role="alert" className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 text-center"><p className="text-[#E8E6E1] mb-4">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="rounded-xl bg-[#D97757] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C26547]">Reintentar</button></div>
          : visibleAssets.length === 0 ? <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 rounded-2xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center mb-5">{tab === "image" ? <ImageIcon className="w-8 h-8 text-[#9A9893]" /> : <Film className="w-8 h-8 text-[#9A9893]" />}</div><p className="text-[#B7AAA0] font-medium">{tab === "image" ? "Tus imágenes generadas aparecerán aquí." : "Tus clips y anuncios finales aparecerán aquí."}</p></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleAssets.map((asset) => asset.media_type === "video" ? <VideoCard key={asset.id} asset={asset} selectionMode={selectionMode} selectionOrder={selectedVideoIds.indexOf(asset.id) + 1} selectionDisabled={merging || (selectedVideoIds.length >= 10 && !selectedVideoIds.includes(asset.id))} onToggle={() => toggleVideo(asset.id)} /> : <article key={asset.id} className="bg-[#2A2826] rounded-2xl border border-[#3A3833] overflow-hidden group">
                <div className="aspect-square bg-[#1E1C1A] relative overflow-hidden">
                  {asset.public_url ? <img src={asset.public_url} alt={asset.title ? `Creativo para ${asset.title}` : "Creativo generado"} className="w-full h-full object-contain" /> : <ImageIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#9A9893]" />}
                  {asset.public_url && <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => handleImageDownload(asset.public_url!, asset.id)} className="px-4 py-2 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] transition-colors inline-flex items-center gap-2"><Download className="w-4 h-4" />Descargar</button></div>}
                </div>
                <div className="p-4 space-y-2"><p className="text-sm font-semibold text-[#E8E6E1] truncate">{asset.title || "Imagen generada"}</p><div className="flex items-center gap-2 flex-wrap">{typeof asset.metadata?.angle === "string" && <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30">{ANGLE_NAMES[asset.metadata.angle] || asset.metadata.angle}</span>}{asset.format && <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#3A3833] text-[#9A9893]">{FORMAT_NAMES[asset.format] || asset.format}</span>}</div><p className="text-xs text-[#9A9893]">{formatDate(asset.created_at)}</p></div>
              </article>)}
            </div>}
    </section>
  </div>
}
