"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import QuantitySelector from "./QuantitySelector"
import styles from "./GeneratorWorkspace.module.css"

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
  showQuantity?: boolean
  highlightProduct?: boolean
  compact?: boolean
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
  showQuantity = true,
  highlightProduct = false,
  compact = false,
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
    <div className={styles.tabContent}>
      {/* Producto */}
      <section className={`${styles.formCard} ${styles.productFormCard}`}>
        <div className={styles.formHeading}>
          <span>01</span>
          <div><h2>Tu producto</h2><p>La base para construir una estrategia relevante.</p></div>
        </div>
        <textarea
          value={producto}
          onChange={(e) => setProducto(e.target.value)}
          rows={3}
          placeholder="Describe qué vendes y para quién."
          className={`${styles.panelTextarea} ${highlightProduct ? styles.fieldHighlight : ""}`}
        />
        <div className={styles.helper}><span>✦</span> Pixel IA usará esta descripción para recomendar el mejor ángulo.</div>
      </section>

      {/* Texto del anuncio con jerarquía */}
      <section className={`${styles.formCard} ${styles.productFormCard}`}>
        <div className={styles.formHeading}>
          <span>02</span>
          <div><h2>Texto del anuncio</h2><p>Opcional · Pixel IA puede proponerlo.</p></div>
        </div>

        <div className={styles.formFields}>
          <div>
            <label>
              Título del anuncio
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título principal"
              className={styles.panelInput}
            />
          </div>

          <div>
            <label>
              Subtítulo
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Mensaje de apoyo"
              className={styles.panelInput}
            />
          </div>

          <div>
            <label>
              CTA (Llamado a la acción)
            </label>
            <div className={styles.ctaField}>
              <span aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="text"
                value={ctaContacto}
                onChange={(e) => setCtaContacto(e.target.value)}
                placeholder="Ej. Comprar ahora o WhatsApp"
                className={`${styles.panelInput} ${styles.ctaInput}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cantidad */}
      {showQuantity && (
        <section className={`${styles.formCard} ${styles.quantityCard}`}>
          <QuantitySelector cantidad={cantidad} setCantidad={setCantidad} loading={loading} />
        </section>
      )}

      {/* Imagen de referencia */}
      <section className={`${styles.formCard} ${styles.productFormCard}`}>
        <div className={styles.formHeading}>
          <span>04</span>
          <div><h2>Imagen de referencia</h2><p>Opcional · Ayuda a respetar producto y marca.</p></div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className={styles.hiddenFileInput}
        />

        {uploading ? (
          <div className={styles.uploadState}>
            <svg className="animate-spin h-8 w-8 text-[#D97757]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Subiendo imagen...</span>
          </div>
        ) : imagenReferencia ? (
          <div className={styles.referencePreview}>
            <img
              src={imagenReferencia}
              alt="Referencia"
              className={styles.referenceImage}
            />
            <div className={styles.referenceMeta}>
              <div>
                <svg className="w-4 h-4 text-[#D97757] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Imagen lista para usar</span>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteReference}
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
            className={`${styles.uploadDrop} ${dragActive ? styles.uploadDropActive : ""}`}
          >
            <div className={styles.uploadIcon}>
              <svg className="w-6 h-6 text-[#D97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p>
                {dragActive ? "Suelta la imagen aquí" : "Arrastra una imagen"}
              </p>
              <small>
                o haz clic para seleccionar · PNG, JPG, WEBP (máx. 5MB)
              </small>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
