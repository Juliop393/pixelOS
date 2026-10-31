"use client"

import { useEffect, useState } from "react"
import { Download, Film, Image as ImageIcon, Loader2, Play } from "lucide-react"
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

function VideoCard({ asset }: { asset: Asset }) {
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

  return <article className="bg-[#2A2826] rounded-2xl border border-[#3A3833] overflow-hidden">
    <div className="aspect-square bg-[#11100F] relative flex items-center justify-center">
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
      <button type="button" aria-pressed={tab === "image"} onClick={() => setTab("image")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === "image" ? "bg-[#D97757] text-white" : "text-[#AFA9A1] hover:text-[#E8E6E1] hover:bg-[#2A2826]"}`}>Imágenes <span className="opacity-70">{imageCount}</span></button>
      <button type="button" aria-pressed={tab === "video"} onClick={() => setTab("video")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === "video" ? "bg-[#D97757] text-white" : "text-[#AFA9A1] hover:text-[#E8E6E1] hover:bg-[#2A2826]"}`}>Videos <span className="opacity-70">{videoCount}</span></button>
    </div>

    <section id="assets-panel" aria-live="polite" aria-busy={loading}>
      {loading ? <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex items-center justify-center gap-3 text-[#B7AAA0]"><Loader2 className="w-5 h-5 animate-spin" />Cargando tus creativos…</div>
        : error ? <div role="alert" className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 text-center"><p className="text-[#E8E6E1] mb-4">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="rounded-xl bg-[#D97757] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C26547]">Reintentar</button></div>
          : visibleAssets.length === 0 ? <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 rounded-2xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center mb-5">{tab === "image" ? <ImageIcon className="w-8 h-8 text-[#9A9893]" /> : <Film className="w-8 h-8 text-[#9A9893]" />}</div><p className="text-[#B7AAA0] font-medium">{tab === "image" ? "Tus imágenes generadas aparecerán aquí." : "Tus clips y anuncios finales aparecerán aquí."}</p></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleAssets.map((asset) => asset.media_type === "video" ? <VideoCard key={asset.id} asset={asset} /> : <article key={asset.id} className="bg-[#2A2826] rounded-2xl border border-[#3A3833] overflow-hidden group">
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
