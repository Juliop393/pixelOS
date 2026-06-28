"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import QuantitySelector from "./QuantitySelector"
import GenerateButton from "./GenerateButton"

interface ProductFormProps {
  producto: string
  setProducto: (v: string) => void
  textoAnuncio: string
  setTextoAnuncio: (v: string) => void
  ctaContacto: string
  setCtaContacto: (v: string) => void
  cantidad: number
  setCantidad: (n: number) => void
  loading: boolean
  onGenerate: () => void
  canGenerate: boolean
  credits: number
  progress: { completed: number; total: number }
  imagenReferencia: string | null
  setImagenReferencia: (v: string | null) => void
  nombreImagenReferencia: string | null
  setNombreImagenReferencia: (v: string | null) => void
}

export default function ProductForm({
  producto,
  setProducto,
  textoAnuncio,
  setTextoAnuncio,
  ctaContacto,
  setCtaContacto,
  cantidad,
  setCantidad,
  loading,
  onGenerate,
  canGenerate,
  credits,
  progress,
  imagenReferencia,
  setImagenReferencia,
  nombreImagenReferencia,
  setNombreImagenReferencia,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
      const response = await fetch("/api/upload", {
        method: "POST",
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

  const handleDelete = async () => {
    if (!nombreImagenReferencia) return

    setUploading(true)
    try {
      const response = await fetch(`/api/upload?fileName=${nombreImagenReferencia}`, {
        method: "DELETE",
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
    <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-5">
      <h3 className="text-sm font-bold text-[#E8E6E1] mb-4 uppercase tracking-wider">
        Tu Producto
      </h3>
      <input
        type="text"
        value={producto}
        onChange={(e) => setProducto(e.target.value)}
        placeholder="Describe tu producto (Ej: Crema hidratante para piel seca, marca propia, precio S/89)"
        className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors mb-3"
      />

      <div className="space-y-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
            Texto del anuncio (opcional)
          </label>
          <input
            type="text"
            value={textoAnuncio}
            onChange={(e) => setTextoAnuncio(e.target.value)}
            placeholder="Ej: ¡50% descuento solo hoy! Envío gratis"
            className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2.5 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
            CTA o contacto (opcional)
          </label>
          <input
            type="text"
            value={ctaContacto}
            onChange={(e) => setCtaContacto(e.target.value)}
            placeholder="Ej: WhatsApp 999-888-777 | Compra en @tumarca"
            className="w-full bg-[#1E1C1A] border border-[#3A3833] px-3 py-2.5 rounded-lg text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
          />
        </div>
      </div>

      <QuantitySelector cantidad={cantidad} setCantidad={setCantidad} loading={loading} />

      <GenerateButton
        onClick={onGenerate}
        disabled={!canGenerate}
        loading={loading}
        credits={credits}
        cantidad={cantidad}
        progress={progress}
      />

      {/* Input de archivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Control interactivo de la imagen de referencia */}
      <div className="mt-4 pt-4 border-t border-[#3A3833]">
        {uploading ? (
          <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-[#9A9893] border border-[#3A3833] bg-[#1E1C1A]">
            <svg className="animate-spin h-4 w-4 text-[#D97757]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Subiendo imagen...
          </div>
        ) : imagenReferencia ? (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#D97757]/30 bg-[#1E1C1A]">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#2A2826] border border-[#3A3833] flex-shrink-0">
              <img
                src={imagenReferencia}
                alt="Referencia"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#E8E6E1] truncate">Imagen de referencia</p>
              <p className="text-[10px] text-[#9A9893] truncate">Lista para usar</p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-lg text-[#9A9893] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-200"
              title="Eliminar imagen"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-[#9A9893] border border-[#3A3833] hover:border-[#D97757]/30 hover:text-[#E8E6E1] transition-all duration-200"
          >
            <svg className="w-4 h-4" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Subir imagen de referencia (Opcional)
          </button>
        )}
      </div>
    </div>
  )
}