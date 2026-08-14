"use client"

import { useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export type VideoPhase = "idle" | "generating" | "generated" | "error"

export function useVideoGenerator() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoPhase, setVideoPhase] = useState<VideoPhase>("idle")
  const [videoError, setVideoError] = useState<string | null>(null)

  const generateVideo = async (
    imageUrl: string,
    angle: string,
    hook: string,
    style: string,
  ) => {
    if (!imageUrl) {
      toast.error("Genera un creativo primero")
      return
    }
    if (!angle) {
      toast.error("Selecciona un ángulo de venta")
      return
    }

    setVideoPhase("generating")
    setVideoError(null)
    setVideoUrl(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setVideoPhase("error")
        setVideoError("Sesión expirada")
        toast.error("Sesión expirada", {
          description: "Vuelve a iniciar sesión para continuar",
        })
        return
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ imageUrl, angle, hook, style }),
      })

      const data = await response.json()

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl)
        setVideoPhase("generated")
        toast.success("Video generado", {
          description: "Tu video está listo para descargar",
        })
      } else {
        setVideoPhase("error")
        setVideoError(data.error || "Error al generar el video")
        toast.error("Error al generar video", {
          description: data.error || "Intenta de nuevo",
        })
      }
    } catch (err) {
      setVideoPhase("error")
      setVideoError("Error de conexión")
      toast.error("Error de conexión", {
        description: "No se pudo conectar con el servicio de video",
      })
    }
  }

  const resetVideo = () => {
    setVideoUrl(null)
    setVideoPhase("idle")
    setVideoError(null)
  }

  return {
    videoUrl,
    videoPhase,
    videoError,
    generateVideo,
    resetVideo,
  }
}