"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"
import { Check, Image as ImageIcon, Palette, Trash2, Type, Upload, UserRound } from "lucide-react"
import styles from "@/components/dashboard/BrandIdentity.module.css"

export default function IdentidadMarcaPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [faceUrl, setFaceUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState("#E8724A")
  const [secondaryColor, setSecondaryColor] = useState("#F5F0E8")
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFace, setUploadingFace] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const uid = session.user.id
      setUserId(uid)
      setAccessToken(session.access_token)

      const { data: existing } = await supabase
        .from("brand_identity")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle()

      if (existing) {
        setBrandName(existing.brand_name || "")
        setLogoUrl(existing.logo_url || null)
        setFaceUrl(existing.face_url || null)
        setPrimaryColor(existing.primary_color || "#E8724A")
        setSecondaryColor(existing.secondary_color || "#F5F0E8")
      }

      setLoading(false)
    }

    init()
  }, [])

  const handleFileUpload = async (file: File, type: "logo" | "face") => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingFace
    const urlSetter = type === "logo" ? setLogoUrl : setFaceUrl

    setter(true)
    try {
      if (!accessToken) {
        toast.error("Sesión expirada", {
          description: "Vuelve a iniciar sesión para continuar",
        })
        return
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("bucket", "brand-assets")

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const data = await res.json()

      if (!data.success) {
        toast.error("Error al subir", { description: data.error || "Intenta de nuevo" })
        return
      }

      urlSetter(data.publicUrl)
      toast.success(`${type === "logo" ? "Logo" : "Foto"} subido`)
    } catch {
      toast.error("Error al subir el archivo")
    } finally {
      setter(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.from("brand_identity").upsert({
        user_id: userId,
        brand_name: brandName || null,
        logo_url: logoUrl,
        face_url: faceUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })

      if (error) {
        toast.error("Error al guardar", { description: error.message })
        return
      }

      toast.success("Identidad de marca guardada")
    } catch {
      toast.error("Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  const fileInput = (type: "logo" | "face", uploading: boolean) => (
    <input
      type="file"
      accept="image/*"
      className={styles.srOnly}
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFileUpload(file, type)
        e.target.value = ""
      }}
      disabled={uploading}
    />
  )

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div id="dashboard-brand" className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            <i aria-hidden="true" />
            Tu marca
          </span>
          <h1>Identidad de Marca</h1>
          <p>Personaliza tus creativos con los colores y activos de tu marca</p>
        </header>

        <div className={styles.grid}>
          {/* Nombre de la marca */}
          <section className={`${styles.card} ${styles.wide}`}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true"><Type /></span>
              <div>
                <label htmlFor="brand-name" className={styles.cardTitle}>Nombre de la marca</label>
                <span className={styles.cardHint}>Así se llama tu marca.</span>
              </div>
            </div>
            <input
              id="brand-name"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Ej: PixelFM"
              className={styles.input}
            />
          </section>

          {/* Logo */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true"><ImageIcon /></span>
              <div>
                <h2 className={styles.cardTitle}>Logo de la marca</h2>
                <span className={styles.cardHint}>El logo de tu propia marca.</span>
              </div>
            </div>
            <div className={styles.upload}>
              <div className={`${styles.preview} ${styles.previewLogo} ${logoUrl ? "" : styles.previewEmpty}`}>
                {logoUrl ? <img src={logoUrl} alt="Logo preview" /> : <ImageIcon aria-hidden="true" />}
                {uploadingLogo && <span className={styles.previewBusy}><span className={styles.spinner} /></span>}
              </div>
              <div className={styles.uploadActions}>
                <span className={styles.uploadState} aria-live="polite">
                  {uploadingLogo ? "Subiendo..." : logoUrl ? "Logo cargado" : "Aún no hay logo"}
                </span>
                <div className={styles.uploadButtons}>
                  <label className={`${styles.fileButton} ${uploadingLogo ? styles.fileButtonBusy : ""}`}>
                    <Upload aria-hidden="true" />
                    {uploadingLogo ? "Subiendo..." : "Seleccionar archivo"}
                    {fileInput("logo", uploadingLogo)}
                  </label>
                  {logoUrl && (
                    <button type="button" onClick={() => setLogoUrl(null)} className={styles.removeButton}>
                      <Trash2 aria-hidden="true" />
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Rostro / Foto */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true"><UserRound /></span>
              <div>
                <h2 className={styles.cardTitle}>Rostro / Foto del representante</h2>
                <span className={styles.cardHint}>La persona que representa tu marca.</span>
              </div>
            </div>
            <div className={styles.upload}>
              <div className={`${styles.preview} ${styles.previewFace} ${faceUrl ? "" : styles.previewEmpty}`}>
                {faceUrl ? <img src={faceUrl} alt="Face preview" /> : <UserRound aria-hidden="true" />}
                {uploadingFace && <span className={styles.previewBusy}><span className={styles.spinner} /></span>}
              </div>
              <div className={styles.uploadActions}>
                <span className={styles.uploadState} aria-live="polite">
                  {uploadingFace ? "Subiendo..." : faceUrl ? "Foto cargada" : "Aún no hay foto"}
                </span>
                <div className={styles.uploadButtons}>
                  <label className={`${styles.fileButton} ${uploadingFace ? styles.fileButtonBusy : ""}`}>
                    <Upload aria-hidden="true" />
                    {uploadingFace ? "Subiendo..." : "Seleccionar archivo"}
                    {fileInput("face", uploadingFace)}
                  </label>
                  {faceUrl && (
                    <button type="button" onClick={() => setFaceUrl(null)} className={styles.removeButton}>
                      <Trash2 aria-hidden="true" />
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Colores */}
          <section className={`${styles.card} ${styles.wide}`}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true"><Palette /></span>
              <div>
                <h2 className={styles.cardTitle}>Paleta de colores</h2>
                <span className={styles.cardHint}>Los colores que identifican a tu marca.</span>
              </div>
            </div>
            <div className={styles.palette}>
              <div className={styles.colorField}>
                <span className={styles.swatch} style={{ backgroundColor: primaryColor }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    aria-label="Elegir color principal"
                  />
                </span>
                <div className={styles.colorText}>
                  <label htmlFor="primary-color" className={styles.colorLabel}>Color principal</label>
                  <input
                    id="primary-color"
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#E8724A"
                    className={`${styles.input} ${styles.mono}`}
                  />
                </div>
              </div>
              <div className={styles.colorField}>
                <span className={styles.swatch} style={{ backgroundColor: secondaryColor }}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    aria-label="Elegir color secundario"
                  />
                </span>
                <div className={styles.colorText}>
                  <label htmlFor="secondary-color" className={styles.colorLabel}>Color secundario</label>
                  <input
                    id="secondary-color"
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#F5F0E8"
                    className={`${styles.input} ${styles.mono}`}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Botón guardar */}
        <div className={styles.saveBar}>
          <p>Los cambios se aplican al guardar.</p>
          <button onClick={handleSave} disabled={saving} className={styles.saveButton}>
            {saving ? (
              <>
                <span className={styles.spinner} />
                Guardando...
              </>
            ) : (
              <>
                <Check aria-hidden="true" />
                Guardar cambios
              </>
            )}
          </button>
        </div>
        <div className={styles.bottomSpace} />
      </div>
    </div>
  )
}
