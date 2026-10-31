"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Image as ImageIcon, RotateCw, X } from "lucide-react"
import { supabase } from "@/lib/supabase"

export type VideoLibraryImage = {
  id: string
  public_url: string
  title: string | null
  format: string | null
}

type CatalogRow = VideoLibraryImage & { bucket: string; storage_path: string }

function isOwnImage(row: CatalogRow, userId: string): boolean {
  if (row.bucket !== "creativos" || row.storage_path.split("/")[0] !== userId) return false
  try {
    const imageUrl = new URL(row.public_url)
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    return imageUrl.protocol === "https:"
      && imageUrl.hostname === supabaseUrl.hostname
      && decodeURIComponent(imageUrl.pathname) === `/storage/v1/object/public/creativos/${row.storage_path}`
  } catch {
    return false
  }
}

export default function VideoImageLibraryPicker({ open, onClose, onSelect }: {
  open: boolean
  onClose: () => void
  onSelect: (image: VideoLibraryImage) => void
}) {
  const [images, setImages] = useState<VideoLibraryImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!open) return
    let active = true
    const loadImages = async () => {
      setLoading(true)
      setError("")
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")
        // RLS restricts SELECT to this authenticated user's catalog rows.
        const { data, error: queryError } = await supabase.from("creative_assets")
          .select("id,bucket,storage_path,public_url,title,format")
          .eq("media_type", "image")
          .order("created_at", { ascending: false })
        if (queryError) throw new Error("No se pudo cargar tu biblioteca.")
        if (active) setImages(((data ?? []) as CatalogRow[]).filter((row) => isOwnImage(row, user.id)))
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar tu biblioteca.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadImages()
    return () => { active = false }
  }, [open, reload])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="video-library-title" className="flex max-h-[min(720px,90vh)] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl border border-[#55443c] bg-[#181411] text-[#f3e9e0] shadow-[0_32px_100px_rgba(0,0,0,.7)]">
      <header className="flex items-center justify-between gap-4 border-b border-[#ffffff17] px-6 py-5">
        <div><h2 id="video-library-title" className="text-xl font-semibold">Elegir imagen</h2><p className="mt-1 text-sm text-[#aa9d92]">Tus imágenes de Mis creativos, listas para usar como referencia.</p></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Cerrar biblioteca" className="rounded-lg border border-[#ffffff24] p-2 text-[#d9cec5] transition hover:border-[#e58b69] hover:bg-[#2a211c]"><X size={18} /></button>
      </header>
      <div className="min-h-48 overflow-y-auto px-6 py-6">
        {loading ? <p className="py-14 text-center text-sm text-[#b7aaa0]" role="status">Cargando tus imágenes...</p>
          : error ? <div className="flex flex-col items-center gap-4 py-14 text-center"><p role="alert" className="text-sm text-[#e7a59d]">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-[#a9694e] px-4 py-2 text-sm hover:bg-[#2a211c]"><RotateCw size={15} />Reintentar</button></div>
          : images.length === 0 ? <div className="flex flex-col items-center gap-3 py-14 text-center text-[#aa9d92]"><ImageIcon size={30} /><p>Aún no tienes imágenes en tu biblioteca.</p></div>
            : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((image) => <button type="button" key={image.id} onClick={() => onSelect(image)} className="group min-w-0 overflow-hidden rounded-xl border border-[#ffffff20] bg-[#211b18] text-left transition hover:border-[#e18862] hover:bg-[#2b211c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e18862]" aria-label={`Elegir ${image.title || "imagen"}`}>
              <div className="aspect-square bg-[#0e0c0b]"><img src={image.public_url} alt={image.title || "Imagen de Mis creativos"} className="h-full w-full object-contain" loading="lazy" /></div>
              <div className="p-3"><p className="truncate text-sm font-medium text-[#eee5de]">{image.title || "Imagen sin título"}</p>{image.format && <p className="mt-1 text-xs text-[#aa9d92]">{image.format}</p>}</div>
            </button>)}</div>}
      </div>
    </section>
  </div>, document.body)
}
