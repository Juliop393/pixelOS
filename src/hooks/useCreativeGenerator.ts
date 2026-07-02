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
  const [textoAnuncio, setTextoAnuncio] = useState("")
  const [ctaContacto, setCtaContacto] = useState("")
  const [aspectRatio, setAspectRatio] = useState("square")
  const [visualStyle, setVisualStyle] = useState("photorealistic")
  const [brandColor, setBrandColor] = useState("")
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null)
  const [imagenReferencia, setImagenReferencia] = useState<string | null>(null)
  const [nombreImagenReferencia, setNombreImagenReferencia] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState(1)
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

    const payload = {
      producto,
      textoAnuncio: textoAnuncio || null,
      ctaContacto: ctaContacto || null,
      angulo: selectedAngle,
      formato: aspectRatio,
      estiloVisual: visualStyle,
      brandColor: brandColor || null,
      userId: userId || "user_beta_001",
      imagenReferencia: imagenReferencia || null,
      brandIdentity,
    }

    console.log("Payload enviado al webhook:", payload)
    console.log(`Generando ${cantidad} creativos en paralelo...`)

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "http://localhost:5678/webhook/generar-creativo"

    const generateOne = async (): Promise<{ success: boolean; imageUrl?: string; copy?: string }> => {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.imageUrl) {
          return { success: true, imageUrl: data.imageUrl, copy: data.copy }
        } else {
          throw new Error("Respuesta inválida del servidor")
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
      }>

      const successCount = successfulResults.length
      const failCount = cantidad - successCount

      if (successCount === 0) {
        // No se generó nada: no descontamos créditos.
        throw new Error("Todas las generaciones fallaron")
      }

      // Descontamos 1 crédito por cada imagen generada con éxito, tanto en el
      // estado local como en Supabase para que persista.
      const newCredits = Math.max(0, credits - successCount)
      setCredits(newCredits)

      if (userId) {
        const { error: creditError } = await supabase
          .from("user_credits")
          .update({ credits: newCredits })
          .eq("user_id", userId)

        if (creditError) {
          console.error("Error actualizando créditos en Supabase:", creditError)
        }
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

  const handleDownload = () => {
    if (result?.imageUrl) {
      const link = document.createElement("a")
      link.href = result.imageUrl
      link.download = `creativo-${selectedAngle}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Descarga iniciada", {
        description: "Tu creativo se está descargando",
      })
    }
  }

  const handleDownloadAll = () => {
    if (generatedImages.length === 0) return

    generatedImages.forEach((img, idx) => {
      setTimeout(() => {
        const link = document.createElement("a")
        link.href = img.imageUrl
        link.download = `creativo-${idx + 1}-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }, idx * 300)
    })

    toast.success("Descargando creativos", {
      description: `${generatedImages.length} imagen${generatedImages.length > 1 ? "es" : ""} se están descargando`,
    })
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
    textoAnuncio, setTextoAnuncio,
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