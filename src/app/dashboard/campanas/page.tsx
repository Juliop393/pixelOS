"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { createBrowserClient } from "@supabase/ssr"

export default function IdentidadMarcaPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [faceUrl, setFaceUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState("#E8724A")
  const [secondaryColor, setSecondaryColor] = useState("#F5F0E8")

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
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bucket", "brand-assets")

      const res = await fetch("/api/upload", { method: "POST", body: formData })
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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Identidad de Marca</h1>
        <p className="text-[#9A9893]">Personaliza tus creativos con los colores y activos de tu marca</p>
      </div>

      <div className="space-y-6">
        {/* Nombre de la marca */}
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
            Nombre de la marca
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ej: PixelOS"
            className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
          />
        </div>

        {/* Logo */}
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-3">
            Logo de la marca
          </label>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-2" />
              ) : (
                <svg className="w-8 h-8 text-[#9A9893]/30" width={32} height={32} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E1C1A] border border-[#3A3833] text-sm text-[#9A9893] hover:text-[#E8E6E1] hover:border-[#D97757]/50 transition-all cursor-pointer">
                {uploadingLogo ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
                    Subiendo...
                  </span>
                ) : (
                  "Seleccionar archivo"
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, "logo")
                    e.target.value = ""
                  }}
                  disabled={uploadingLogo}
                />
              </label>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="ml-2 text-xs text-[#9A9893] hover:text-red-400 transition-colors"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Rostro / Foto */}
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-3">
            Rostro / Foto del representante
          </label>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center overflow-hidden flex-shrink-0">
              {faceUrl ? (
                <img src={faceUrl} alt="Face preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-[#9A9893]/30" width={32} height={32} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E1C1A] border border-[#3A3833] text-sm text-[#9A9893] hover:text-[#E8E6E1] hover:border-[#D97757]/50 transition-all cursor-pointer">
                {uploadingFace ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
                    Subiendo...
                  </span>
                ) : (
                  "Seleccionar archivo"
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, "face")
                    e.target.value = ""
                  }}
                  disabled={uploadingFace}
                />
              </label>
              {faceUrl && (
                <button
                  onClick={() => setFaceUrl(null)}
                  className="ml-2 text-xs text-[#9A9893] hover:text-red-400 transition-colors"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Colores */}
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <label className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-4">
            Paleta de colores
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#9A9893] mb-2">Color principal</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-10 h-10 cursor-pointer"
                  />
                  <div
                    className="w-10 h-10 rounded-xl border border-[#3A3833]"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#E8724A"
                  className="flex-1 bg-[#1E1C1A] border border-[#3A3833] px-3 py-2 rounded-lg text-sm text-[#E8E6E1] font-mono focus:outline-none focus:border-[#D97757]/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#9A9893] mb-2">Color secundario</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-10 h-10 cursor-pointer"
                  />
                  <div
                    className="w-10 h-10 rounded-xl border border-[#3A3833]"
                    style={{ backgroundColor: secondaryColor }}
                  />
                </div>
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#F5F0E8"
                  className="flex-1 bg-[#1E1C1A] border border-[#3A3833] px-3 py-2 rounded-lg text-sm text-[#E8E6E1] font-mono focus:outline-none focus:border-[#D97757]/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>
    </div>
  )
}