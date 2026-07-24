"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import QuantitySelector from "./QuantitySelector"

interface ProductFormProps {
  producto: string
  setProducto: (v: string) => void
  titulo: string
  setTitulo: (v: string) => void
  subtitulo: string
  setSubtitulo: (v: string) => void
  ctaContacto: string
  setCtaContacto: (v: string) => void
  cantidad: number
  setCantidad: (n: number) => void
  loading: boolean
  imagenReferencia: string | null
  setImagenReferencia: (v: string | null) => void
  nombreImagenReferencia: string | null
  setNombreImagenReferencia: (v: string | null) => void
}

export default function ProductForm({
  producto,
  setProducto,
  titulo,
  setTitulo,
  subtitulo,
  setSubtitulo,
  ctaContacto,
  setCtaContacto,
  cantidad,
  setCantidad,
  loading,
  imagenReferencia,
  setImagenReferencia,
  nombreImagenReferencia,
  setNombreImagenReferencia,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const uploadFile = async (file: File) => {
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Archivo demasiado grande", {
        description: "El tamaño máximo permitido es 5MB",
      })
      return
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Formato inválido", {
        description: "Solo se permiten imágenes (PNG, JPG, WEBP)",
      })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error("Sesión expirada", {
          description: "Vuelve a iniciar sesión para continuar",
        })
        return
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error en la subida")
      }

      const data = await response.json()
      if (data.success && data.publicUrl) {
        setImagenReferencia(data.publicUrl)
        setNombreImagenReferencia(data.fileName)
        toast.success("Imagen de referencia subida", {
          description: "La imagen se usará como base visual",
        })
      } else {
        throw new Error(data.error || "Error al subir la imagen")
      }
    } catch (err) {
      console.error("Error al subir archivo:", err)
      toast.error("Error al subir imagen", {
        description: err instanceof Error ? err.message : "Intenta nuevamente",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDelete = async () => {
    if (!nombreImagenReferencia) return

    setUploading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast.error("Sesión expirada", {
          description: "Vuelve a iniciar sesión para continuar",
        })
        return
      }

      const response = await fetch(`/api/upload?fileName=${encodeURIComponent(nombreImagenReferencia)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Error al eliminar")
      }

      const data = await response.json()
      if (data.success) {
        setImagenReferencia(null)
        setNombreImagenReferencia(null)
        toast.success("Imagen de referencia eliminada")
      } else {
        throw new Error(data.error || "Error al eliminar")
      }
    } catch (err) {
      console.error("Error al eliminar archivo:", err)
      toast.error("Error al eliminar imagen", {
        description: err instanceof Error ? err.message : "Intenta nuevamente",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Producto */}
      <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
        <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
          Tu Producto
        </h3>
        <textarea
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          rows={3}
          placeholder="Describe tu producto (Ej: Crema hidratante para piel seca, marca propia, precio S/89)"
          className="w-full resize-none bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
        />
      </div>

      {/* Texto del anuncio con jerarquía */}
      <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
        <h3 className="text-sm font-bold text-[#E8E6E1] mb-1 uppercase tracking-wider">
          Texto del anuncio
        </h3>
        <p className="text-xs text-[#9A9893] mb-4">
          Dale jerarquía a tu mensaje (opcional)
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
              Título del anuncio
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título principal"
              className="w-full text-center bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-lg font-bold text-[#E8E6E1] placeholder:text-[#9A9893]/40 placeholder:font-normal focus:outline-none focus:border-[#D97757]/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
              Subtítulo
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Texto de apoyo secundario"
              className="w-full text-center bg-[#1E1C1A] border border-[#3A3833] px-4 py-2.5 rounded-xl text-sm text-[#9A9893] placeholder:text-[#9A9893]/40 focus:outline-none focus:border-[#D97757]/50 focus:text-[#E8E6E1] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
              CTA (Llamado a la acción)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#D97757]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="text"
                value={ctaContacto}
                onChange={(e) => setCtaContacto(e.target.value)}
                placeholder="Ej: Compra ahora | WhatsApp 999-888-777"
                className="w-full bg-[#1E1C1A] border border-[#D97757]/30 pl-10 pr-4 py-3 rounded-xl text-sm font-semibold text-[#E8E6E1] placeholder:text-[#9A9893]/40 placeholder:font-normal focus:outline-none focus:border-[#D97757] transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Imagen de referencia */}
      <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
        <h3 className="text-sm font-bold text-[#E8E6E1] mb-1 uppercase tracking-wider">
          Imagen de referencia
        </h3>
        <p className="text-xs text-[#9A9893] mb-4">
          Úsala como base visual (opcional)
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
        />

        {uploading ? (
          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 px-4 rounded-2xl border border-dashed border-[#3A3833] bg-[#1E1C1A]">
            <svg className="animate-spin h-8 w-8 text-[#D97757]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs font-medium text-[#9A9893]">Subiendo imagen...</span>
          </div>
        ) : imagenReferencia ? (
          <div className="relative rounded-2xl overflow-hidden border border-[#D97757]/40 bg-[#1E1C1A] group">
            <img
              src={imagenReferencia}
              alt="Referencia"
              className="w-full h-48 object-contain bg-[#161412]"
            />
            <div className="flex items-center justify-between gap-3 p-3 border-t border-[#3A3833]">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-[#D97757] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold text-[#E8E6E1] truncate">Imagen lista para usar</span>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 transition-all duration-200"
                title="Eliminar imagen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setDragActive(false)
            }}
            onDrop={handleDrop}
            className={`w-full flex flex-col items-center justify-center gap-3 py-12 px-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-[#D97757] bg-[#D97757]/10"
                : "border-[#3A3833] bg-[#1E1C1A] hover:border-[#D97757]/40 hover:bg-[#1E1C1A]/60"
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${dragActive ? "bg-[#D97757]/20" : "bg-[#2A2826]"}`}>
              <svg className="w-6 h-6 text-[#D97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#E8E6E1]">
                {dragActive ? "Suelta la imagen aquí" : "Arrastra una imagen"}
              </p>
              <p className="text-xs text-[#9A9893] mt-0.5">
                o haz clic para seleccionar · PNG, JPG, WEBP (máx. 5MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cantidad */}
      <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] px-5 pt-1 pb-5">
        <QuantitySelector cantidad={cantidad} setCantidad={setCantidad} loading={loading} />
      </div>
    </div>
  )
}
