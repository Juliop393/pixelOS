"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Film, Loader2, RotateCw, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { VIDEO_GENERATION_DURATION } from "./video-data"

type CatalogVideo = {
  id: string
  kind: "scene" | "final"
  title: string | null
  format: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type VideoLibraryClip = {
  assetId: string
  kind: "scene" | "final"
  title: string | null
  videoUrl: string
  duration: number
}

function estimatedDuration(asset: CatalogVideo): number {
  const count = asset.metadata?.sceneCount
  return asset.kind === "final" && typeof count === "number" && Number.isFinite(count) && count > 0
    ? Math.ceil(count * VIDEO_GENERATION_DURATION) : VIDEO_GENERATION_DURATION
}

function readVideoDuration(url: string, fallback: number): Promise<number> {
  return new Promise((resolve) => {
    const media = document.createElement("video")
    const finish = (duration: number) => {
      clearTimeout(timer)
      media.onloadedmetadata = null
      media.onerror = null
      media.removeAttribute("src")
      media.load()
      resolve(duration)
    }
    const timer = setTimeout(() => finish(fallback), 7_000)
    media.preload = "metadata"
    media.onloadedmetadata = () => finish(Number.isFinite(media.duration) && media.duration > 0 ? Math.ceil(media.duration) : fallback)
    media.onerror = () => finish(fallback)
    media.src = url
  })
}

export default function VideoClipLibraryPicker({ open, excludedAssetIds, onClose, onSelect }: {
  open: boolean
  excludedAssetIds: ReadonlySet<string>
  onClose: () => void
  onSelect: (clip: VideoLibraryClip) => void
}) {
  const [videos, setVideos] = useState<CatalogVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!open) return
    let active = true
    const loadVideos = async () => {
      setLoading(true)
      setError("")
      setVideos([])
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")
        // RLS limits the authenticated SELECT to this user's assets.
        const { data, error: queryError } = await supabase.from("creative_assets")
          .select("id,kind,title,format,metadata,created_at")
          .eq("media_type", "video")
          .eq("bucket", "videos")
          .in("kind", ["scene", "final"])
          .order("created_at", { ascending: false })
        if (queryError) throw new Error("No se pudo cargar tu biblioteca de videos.")
        if (active) setVideos((data ?? []) as CatalogVideo[])
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar tu biblioteca de videos.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadVideos()
    return () => { active = false }
  }, [open, reload])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !selectingId) onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose, selectingId])

  const chooseVideo = async (asset: CatalogVideo) => {
    if (selectingId || excludedAssetIds.has(asset.id)) return
    setSelectingId(asset.id)
    setError("")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")
      const response = await fetch(`/api/assets/video-url?assetId=${encodeURIComponent(asset.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok || typeof result !== "object" || result === null || !("videoUrl" in result) ||
          typeof result.videoUrl !== "string" || !result.videoUrl.startsWith("https://")) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error : "No se pudo abrir este video."
        throw new Error(message)
      }
      const duration = await readVideoDuration(result.videoUrl, estimatedDuration(asset))
      onSelect({ assetId: asset.id, kind: asset.kind, title: asset.title, videoUrl: result.videoUrl, duration })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir este video.")
    } finally {
      setSelectingId(null)
    }
  }

  if (!open) return null

  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !selectingId) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="video-clip-library-title" className="flex max-h-[min(720px,90vh)] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl border border-[#55443c] bg-[#181411] text-[#f3e9e0] shadow-[0_32px_100px_rgba(0,0,0,.7)]">
      <header className="flex items-center justify-between gap-4 border-b border-[#ffffff17] px-6 py-5">
        <div><h2 id="video-clip-library-title" className="text-xl font-semibold">Añadir desde biblioteca</h2><p className="mt-1 text-sm text-[#aa9d92]">Elige un video guardado para incorporarlo a la secuencia.</p></div>
        <button type="button" autoFocus disabled={Boolean(selectingId)} onClick={onClose} aria-label="Cerrar biblioteca" className="rounded-lg border border-[#ffffff24] p-2 text-[#d9cec5] transition hover:border-[#e58b69] hover:bg-[#2a211c] disabled:opacity-50"><X size={18} /></button>
      </header>
      <div className="min-h-48 overflow-y-auto px-6 py-6">
        {loading ? <p className="py-14 text-center text-sm text-[#b7aaa0]" role="status">Cargando tus videos...</p>
          : videos.length === 0 && !error ? <div className="flex flex-col items-center gap-3 py-14 text-center text-[#aa9d92]"><Film size={30} /><p>Aún no tienes videos guardados.</p></div>
            : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{videos.map((asset) => <button type="button" key={asset.id} disabled={Boolean(selectingId) || excludedAssetIds.has(asset.id)} onClick={() => { void chooseVideo(asset) }} className="group min-w-0 overflow-hidden rounded-xl border border-[#ffffff20] bg-[#211b18] text-left transition hover:border-[#e18862] hover:bg-[#2b211c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e18862] disabled:cursor-not-allowed disabled:opacity-50">
              <div className="flex aspect-video items-center justify-center bg-[#0e0c0b]"><Film className="h-9 w-9 text-[#d97757]" aria-hidden="true" /></div>
              <div className="p-3"><span className="text-xs font-semibold text-[#e49a7d]">{asset.kind === "final" ? "Video final" : "Escena"}</span><p className="mt-1 truncate text-sm font-medium text-[#eee5de]">{asset.title || (asset.kind === "final" ? "Anuncio final" : "Clip de escena")}</p><p className="mt-1 text-xs text-[#aa9d92]">{excludedAssetIds.has(asset.id) ? "Ya está en la secuencia" : selectingId === asset.id ? "Preparando video..." : asset.format || new Date(asset.created_at).toLocaleDateString("es-PE")}</p></div>
            </button>)}</div>}
        {error && <div className="mt-4 flex flex-col items-center gap-3 text-center"><p role="alert" className="text-sm text-[#e7a59d]">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-[#a9694e] px-4 py-2 text-sm hover:bg-[#2a211c]"><RotateCw size={15} />Reintentar</button></div>}
        {selectingId && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[#b7aaa0]" role="status"><Loader2 className="h-4 w-4 animate-spin" />Preparando vista previa...</p>}
      </div>
    </section>
  </div>, document.body)
}
