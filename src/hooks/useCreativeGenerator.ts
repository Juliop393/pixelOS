"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"

export type Phase = "select" | "loading" | "result" | "error"
export type GeneratedImage = { imageUrl: string; angle: string }
export type Result = { imageUrl: string; copy: string; angle: string } | null
export type Progress = { completed: number; total: number }

export function useCreativeGenerator() {
  const router = useRouter()
  const { credits, setCredits, userId } = useCredits()
  const [producto, setProducto] = useState("")
  const [titulo, setTitulo] = useState("")
  const [subtitulo, setSubtitulo] = useState("")
  const [ctaContacto, setCtaContacto] = useState("")
  const [aspectRatio, setAspectRatio] = useState("square")
  const [visualStyle, setVisualStyle] = useState("photorealistic")
  const [brandColor, setBrandColor] = useState("")
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null)
  const [imagenReferencia, setImagenReferencia] = useState<string | null>(null)
  const [nombreImagenReferencia, setNombreImagenReferencia] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [safeZoneMeta, setSafeZoneMeta] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [progress, setProgress] = useState<Progress>({ completed: 0, total: 0 })
  const [phase, setPhase] = useState<Phase>("select")
  const [sessionHistory, setSessionHistory] = useState<GeneratedImage[]>([])

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (!loading || phase !== "loading") return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev.completed >= prev.total - 1) {
          return prev
        }
        return { ...prev, completed: prev.completed + 1 }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [loading, phase])

  useEffect(() => {
    if (aspectRatio !== "story") {
      setSafeZoneMeta(false)
    }
  }, [aspectRatio])

  const handleSelectAngle = (angleId: string) => {
    setSelectedAngle(angleId)
  }

  const handleGenerate = async () => {
    if (!producto.trim() || !selectedAngle) {
      toast.error("Completa los campos requeridos", {
        description: "Ingresa tu producto y selecciona un ángulo",
      })
      return
    }

    if (credits < cantidad) {
      toast.error("Créditos insuficientes", {
        description: `Necesitas ${cantidad} crédito${cantidad > 1 ? "s" : ""}, tienes ${credits}`,
      })
      return
    }

    setLoading(true)
    setError(null)
    setPhase("loading")
    setProgress({ completed: 0, total: cantidad })
    setGeneratedImages([])
    setResult(null)

    let brandIdentity = null
    if (userId) {
      const { data: brand } = await supabase
        .from("brand_identity")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (brand) {
        brandIdentity = {
          brandName: brand.brand_name || null,
          brandColors: [brand.primary_color, brand.secondary_color],
          hasLogo: !!brand.logo_url,
          logoUrl: brand.logo_url || null,
          hasFace: !!brand.face_url,
          faceUrl: brand.face_url || null,
        }
      }
    }

    // Componemos el "texto del anuncio" a partir del título y subtítulo para
    // mantener intacto el contrato del webhook de n8n (mismas claves de payload).
    const textoAnuncio = [titulo.trim(), subtitulo.trim()].filter(Boolean).join(" — ")

    const payload = {
      producto,
      textoAnuncio: textoAnuncio || null,
      ctaContacto: ctaContacto || null,
      angulo: selectedAngle,
      formato: aspectRatio,
      estiloVisual: visualStyle,
      brandColor: brandColor || null,
      imagenReferencia: imagenReferencia || null,
      brandIdentity,
      safeZoneMeta,
    }

    console.log(`Generando ${cantidad} creativos en paralelo...`)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    if (!accessToken) {
      setLoading(false)
      setError("Sesión expirada")
      toast.error("Sesión expirada", {
        description: "Vuelve a iniciar sesión para continuar",
      })
      return
    }

    const generateOne = async (): Promise<{ success: boolean; imageUrl?: string; copy?: string; credits?: number }> => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        })

        if (response.status === 402) {
          return { success: false, credits: 0 }
        }

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.imageUrl) {
          return { success: true, imageUrl: data.imageUrl, copy: data.copy, credits: data.credits }
        } else {
          // n8n devolvió una respuesta sin success=true (crédito reembolsado por el servidor)
          return { success: false, credits: data.credits }
        }
      } catch (error) {
        console.error("Error en generación individual:", error)
        return { success: false }
      }
    }

    try {
      const promises = Array(cantidad).fill(null).map(() => generateOne())
      const results = await Promise.all(promises)

      const successfulResults = results.filter((r) => r.success && r.imageUrl) as Array<{
        success: boolean
        imageUrl: string
        copy?: string
        credits?: number
      }>

      const successCount = successfulResults.length
      const failCount = cantidad - successCount

      // Sincronizar créditos desde el servidor: usar el saldo más bajo devuelto.
      const creditsFromServer = results
        .map((r) => r.credits)
        .filter((c): c is number => typeof c === "number" && c >= 0)

      if (creditsFromServer.length > 0) {
        setCredits(Math.min(...creditsFromServer))
      }

      if (successCount === 0) {
        throw new Error("Todas las generaciones fallaron")
      }

      const newImages = successfulResults.map((r) => ({
        imageUrl: r.imageUrl,
        angle: selectedAngle,
      }))

      setGeneratedImages(newImages)
      setResult({
        imageUrl: newImages[0].imageUrl,
        copy: successfulResults[0].copy || "Tu copy persuasivo aparecerá aquí una vez que el motor de IA complete el renderizado del creativo.",
        angle: selectedAngle,
      })
      setPhase("result")

      setSessionHistory((prev) => {
        const newHistory = [...newImages, ...prev]
        return newHistory.slice(0, 20)
      })

      const savedCreativos = JSON.parse(localStorage.getItem("afm_creativos") || "[]")
      const newCreativos = newImages.map((img, idx) => ({
        id: Date.now() + idx,
        imageUrl: img.imageUrl,
        producto: producto,
        angulo: selectedAngle,
        formato: aspectRatio,
        fecha: new Date().toISOString(),
      }))
      savedCreativos.unshift(...newCreativos)
      localStorage.setItem("afm_creativos", JSON.stringify(savedCreativos.slice(0, 50)))

      if (failCount > 0) {
        toast.warning("Generación parcial", {
          description: `${successCount} de ${cantidad} creativos generados exitosamente`,
        })
      } else {
        toast.success(`${successCount} creativo${successCount > 1 ? "s" : ""} generado${successCount > 1 ? "s" : ""}`, {
          description: "Tus anuncios están listos para publicar",
        })
      }
    } catch (error) {
      console.error("Error al generar creativos:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
      setPhase("error")

      toast.error("Error al generar creativos", {
        description: "Hubo un error generando tus creativos. Intenta de nuevo.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    if (selectedAngle) {
      handleSelectAngle(selectedAngle)
    }
  }

  // Descarga directa (sin abrir nueva pestaña ni perder el progreso):
  // descargamos la imagen como blob y forzamos el guardado con un objectURL.
  const downloadImage = async (url: string, fileName: string) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Error al descargar: ${response.status}`)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  }

  const handleDownload = async () => {
    if (!result?.imageUrl) return

    try {
      await downloadImage(result.imageUrl, `creativo-${selectedAngle}-${Date.now()}.png`)
      toast.success("Descarga iniciada", {
        description: "Tu creativo se está descargando",
      })
    } catch (err) {
      console.error("Error al descargar creativo:", err)
      toast.error("Error al descargar", {
        description: "No se pudo descargar la imagen. Intenta de nuevo.",
      })
    }
  }

  const handleDownloadAll = async () => {
    if (generatedImages.length === 0) return

    toast.success("Descargando creativos", {
      description: `${generatedImages.length} imagen${generatedImages.length > 1 ? "es" : ""} se están descargando`,
    })

    for (let idx = 0; idx < generatedImages.length; idx++) {
      try {
        await downloadImage(generatedImages[idx].imageUrl, `creativo-${idx + 1}-${Date.now()}.png`)
      } catch (err) {
        console.error("Error al descargar creativo:", err)
      }
    }
  }

  const handleFeedback = (type: "positive" | "negative") => {
    toast.success("¡Gracias por tu feedback!", {
      description: type === "positive" ? "Nos alegra que te haya funcionado" : "Seguiremos mejorando",
    })
  }

  const handleClearResult = () => {
    setResult(null)
    setSelectedAngle(null)
    setPhase("select")
  }

  const handleSelectFromGenerated = (img: GeneratedImage, copy: string) => {
    setResult({ imageUrl: img.imageUrl, copy, angle: img.angle })
  }

  const handleSelectFromHistory = (item: GeneratedImage) => {
    setResult({ imageUrl: item.imageUrl, copy: "", angle: item.angle })
  }

  return {
    producto, setProducto,
    titulo, setTitulo,
    subtitulo, setSubtitulo,
    ctaContacto, setCtaContacto,
    aspectRatio, setAspectRatio,
    visualStyle, setVisualStyle,
    brandColor, setBrandColor,
    selectedAngle, setSelectedAngle,
    cantidad, setCantidad,
    loading, setLoading,
    error, setError,
    result, setResult,
    generatedImages, setGeneratedImages,
    progress, setProgress,
    phase, setPhase,
    sessionHistory, setSessionHistory,
    credits,
    imagenReferencia, setImagenReferencia,
    nombreImagenReferencia, setNombreImagenReferencia,
    safeZoneMeta, setSafeZoneMeta,
    handleSelectAngle,
    handleGenerate,
    handleRetry,
    handleDownload,
    handleDownloadAll,
    handleFeedback,
    handleClearResult,
    handleSelectFromGenerated,
    handleSelectFromHistory,
  }
}