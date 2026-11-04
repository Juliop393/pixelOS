"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Check, Download, Film, Image as ImageIcon, Layers, Loader2, Play } from "lucide-react"
import { supabase } from "@/lib/supabase"
import l from "@/components/dashboard/Library.module.css"

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
  // Visual-only preview: a muted frame loaded lazily from the same signed-URL endpoint.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const target = stageRef.current
    if (!target || typeof IntersectionObserver === "undefined") return
    const controller = new AbortController()
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token || controller.signal.aborted) return
          const response = await fetch(`/api/assets/video-url?assetId=${encodeURIComponent(asset.id)}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
            signal: controller.signal,
          })
          if (!response.ok) return
          const result: unknown = await response.json()
          if (!controller.signal.aborted && typeof result === "object" && result !== null && "videoUrl" in result &&
              typeof result.videoUrl === "string" && result.videoUrl.startsWith("https://")) setPreviewUrl(result.videoUrl)
        } catch { /* Without a preview the card keeps its placeholder; "Ver video" still works. */ }
      })()
    }, { rootMargin: "120px" })
    observer.observe(target)
    return () => { observer.disconnect(); controller.abort() }
  }, [asset.id])

  const startHoverPreview = () => {
    if (!window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return
    void previewRef.current?.play().catch(() => {})
  }
  const stopHoverPreview = () => {
    const media = previewRef.current
    if (!media) return
    media.pause()
    if (media.duration > 0.2) media.currentTime = 0.15
  }

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

  const title = asset.title || (isFinal ? "Anuncio final" : "Clip de escena")

  return <article className={`${l.card} ${selectionOrder ? l.cardSelected : ""}`} onMouseEnter={startHoverPreview} onMouseLeave={stopHoverPreview}>
    <div ref={stageRef} className={l.stage}>
      <span className={`${l.mediaChip} ${isFinal ? l.mediaChipFinal : ""}`}>{isFinal ? <Layers aria-hidden="true" /> : <Film aria-hidden="true" />}{isFinal ? "Video final" : "Escena"}</span>
      {selectionMode && <button type="button" onClick={onToggle} disabled={selectionDisabled} aria-pressed={selectionOrder > 0} aria-label={selectionOrder ? `Quitar video ${selectionOrder} de la selección` : "Seleccionar video"} className={`${l.selectToggle} ${selectionOrder ? l.selectToggleOn : ""}`}>{selectionOrder ? <><Check aria-hidden="true" />#{selectionOrder}</> : "Seleccionar"}</button>}
      {videoUrl ? <video src={videoUrl} controls playsInline preload="metadata" aria-label={isFinal ? "Video final" : "Video de escena"} onError={() => { setVideoUrl(null); setDownloadUrl(null); setError("No se pudo reproducir el video. Actualiza el enlace e inténtalo de nuevo.") }} /> : <>
        {previewUrl ? <video ref={previewRef} className={l.previewMedia} src={previewUrl} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onLoadedMetadata={(event) => { if (event.currentTarget.duration > 0.2) event.currentTarget.currentTime = 0.15 }} onError={() => setPreviewUrl(null)} />
          : <span className={l.placeholder} aria-hidden="true"><span><Film /></span></span>}
        <span className={l.stageShade} aria-hidden="true" />
        <span className={l.playBadge} aria-hidden="true"><Play /></span>
        <button type="button" onClick={() => { void openVideo() }} disabled={loading} className={l.stageCta}>
          {loading ? <Loader2 className={l.spin} aria-hidden="true" /> : <Play aria-hidden="true" />}
          {loading ? "Preparando video…" : "Ver video"}
        </button>
      </>}
    </div>
    <div className={l.body}>
      <div className={l.bodyTop}>
        <p className={l.title} title={title}>{title}</p>
        <span className={l.date}>{formatDate(asset.created_at)}</span>
      </div>
      {asset.format && <div className={l.tags}><span>{FORMAT_NAMES[asset.format] || asset.format}</span></div>}
      {downloadUrl && <div className={l.bodyActions}><a href={downloadUrl} download={isFinal ? "pixelfm-final.mp4" : "pixelfm-escena.mp4"} className={l.linkAction}><Download aria-hidden="true" />Descargar</a><button type="button" onClick={() => { void openVideo() }} disabled={loading} className={l.mutedAction}>Actualizar enlace</button></div>}
      {error && <p role="alert" className={l.cardError}>{error}</p>}
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

  return <div id="dashboard-assets" className={l.page}>
    <header className={l.header}>
      <div>
        <span className={l.kicker}>TU BIBLIOTECA</span>
        <h1>Mis creativos</h1>
        <p>Tus imágenes y videos, reunidos en un solo lugar.</p>
      </div>

      <div role="group" aria-label="Tipo de creativo" className={l.tabs}>
        <button type="button" aria-pressed={tab === "image"} disabled={merging} onClick={() => { setTab("image"); setSelectionMode(false); setSelectedVideoIds([]); setMergeError("") }} className={tab === "image" ? l.tabActive : ""}><ImageIcon aria-hidden="true" />Imágenes <b>{imageCount}</b></button>
        <button type="button" aria-pressed={tab === "video"} disabled={merging} onClick={() => setTab("video")} className={tab === "video" ? l.tabActive : ""}><Film aria-hidden="true" />Videos <b>{videoCount}</b></button>
      </div>
    </header>

    {tab === "video" && !loading && !error && <div className={l.toolbar}>
      {!selectionMode ? <div className={l.toolbarRow}>
        <div className={l.toolbarIntro}>
          <span className={l.toolbarIcon} aria-hidden="true"><Layers /></span>
          <div><b>Combina tus clips en un anuncio final</b><small>Selecciona escenas en el orden en que quieras unirlas <em>· de 2 a 10 videos</em></small></div>
        </div>
        <div className={l.toolbarActions}>
          <button type="button" disabled={videoCount === 0} onClick={() => { setSelectionMode(true); setMergeError("") }} className={l.ghostButton}><Check aria-hidden="true" />Seleccionar</button>
        </div>
      </div> : <>
        <div className={l.toolbarRow}>
          <div className={l.toolbarIntro}>
            <span className={l.toolbarIcon} aria-hidden="true"><Layers /></span>
            <div><b aria-live="polite">{selectedVideoIds.length} {selectedVideoIds.length === 1 ? "seleccionado" : "seleccionados"}</b><small>Ordena los clips antes de combinarlos <em>· máximo 10</em></small></div>
          </div>
          <div className={l.toolbarActions}>
            <button type="button" disabled={merging} onClick={() => { setSelectionMode(false); setSelectedVideoIds([]); setMergeError("") }} className={l.ghostButton}>Cancelar</button>
            <button type="button" disabled={merging || selectedVideoIds.length < 2} onClick={() => { void combineVideos() }} className={l.primaryButton}>{merging ? <Loader2 className={l.spin} aria-hidden="true" /> : <Layers aria-hidden="true" />}{merging ? "Combinando..." : "Combinar videos"}</button>
          </div>
        </div>
        {selectedVideos.length > 0 && <ol aria-label="Orden de combinación" className={l.order}>{selectedVideos.map((asset, index) => <li key={asset.id}><span className={l.orderIndex}>{index + 1}</span><span className={l.orderTitle}>{asset.title || (asset.kind === "final" ? "Anuncio final" : "Clip de escena")}</span><span className={l.orderKind}>{asset.kind === "final" ? "Final" : "Escena"}</span><button type="button" disabled={merging || index === 0} onClick={() => moveVideo(index, -1)} aria-label={`Subir video ${index + 1}`}><ArrowUp aria-hidden="true" /></button><button type="button" disabled={merging || index === selectedVideos.length - 1} onClick={() => moveVideo(index, 1)} aria-label={`Bajar video ${index + 1}`}><ArrowDown aria-hidden="true" /></button></li>)}</ol>}
        {mergeError && <p role="alert" className={l.alert}>{mergeError}</p>}
      </>}
    </div>}

    <section id="assets-panel" aria-live="polite" aria-busy={loading}>
      {loading ? <div className={l.stateCard}><span className={l.stateIcon}><Loader2 className={l.spin} aria-hidden="true" /></span><p>Cargando tus creativos…</p></div>
        : error ? <div role="alert" className={l.stateCard}><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className={l.primaryButton}>Reintentar</button></div>
          : visibleAssets.length === 0 ? <div className={l.stateCard}><span className={l.stateIcon}>{tab === "image" ? <ImageIcon aria-hidden="true" /> : <Film aria-hidden="true" />}</span><p>{tab === "image" ? "Tus imágenes generadas aparecerán aquí." : "Tus clips y anuncios finales aparecerán aquí."}</p></div>
            : <div className={l.grid}>
              {visibleAssets.map((asset) => asset.media_type === "video" ? <VideoCard key={asset.id} asset={asset} selectionMode={selectionMode} selectionOrder={selectedVideoIds.indexOf(asset.id) + 1} selectionDisabled={merging || (selectedVideoIds.length >= 10 && !selectedVideoIds.includes(asset.id))} onToggle={() => toggleVideo(asset.id)} /> : <article key={asset.id} className={l.card}>
                <div className={l.stage}>
                  {asset.format && <span className={l.mediaChip}>{FORMAT_NAMES[asset.format] || asset.format}</span>}
                  {asset.public_url ? <img src={asset.public_url} alt={asset.title ? `Creativo para ${asset.title}` : "Creativo generado"} loading="lazy" /> : <span className={l.placeholder} aria-hidden="true"><span><ImageIcon /></span></span>}
                  {asset.public_url && <div className={l.hoverOverlay}><button type="button" onClick={() => handleImageDownload(asset.public_url!, asset.id)} className={l.primaryButton}><Download aria-hidden="true" />Descargar</button></div>}
                </div>
                <div className={l.body}>
                  <div className={l.bodyTop}>
                    <p className={l.title} title={asset.title || "Imagen generada"}>{asset.title || "Imagen generada"}</p>
                    <span className={l.date}>{formatDate(asset.created_at)}</span>
                  </div>
                  {typeof asset.metadata?.angle === "string" && <div className={l.tags}><span className={l.tagAccent}>{ANGLE_NAMES[asset.metadata.angle] || asset.metadata.angle}</span></div>}
                  {asset.public_url && <button type="button" onClick={() => handleImageDownload(asset.public_url!, asset.id)} className={`${l.ghostButton} ${l.mobileDownload}`}><Download aria-hidden="true" />Descargar</button>}
                </div>
              </article>)}
            </div>}
    </section>
  </div>
}
