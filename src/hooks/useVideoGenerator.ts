"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export type VideoPhase = "idle" | "generating" | "generated" | "error"

const VIDEO_POLL_INTERVAL_MS = 5_000
const VIDEO_POLL_MAX_ATTEMPTS = 72

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export function useVideoGenerator() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoPhase, setVideoPhase] = useState<VideoPhase>("idle")
  const [videoError, setVideoError] = useState<string | null>(null)
  const runIdRef = useRef(0)
  const inFlightRef = useRef(false)

  useEffect(() => () => {
    runIdRef.current += 1
    inFlightRef.current = false
  }, [])

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
    if (inFlightRef.current) return

    const runId = ++runIdRef.current
    inFlightRef.current = true
    setVideoPhase("generating")
    setVideoError(null)
    setVideoUrl(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error("Sesión expirada")
      }

      const startResponse = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ imageUrl, angle, hook, style }),
      })

      const startData = await startResponse.json()
      const hasTrackingData =
        startResponse.ok &&
        startData.success === true &&
        startData.status === "processing" &&
        typeof startData.requestId === "string" &&
        typeof startData.statusUrl === "string" &&
        typeof startData.responseUrl === "string"

      if (!hasTrackingData) {
        throw new Error(startData.error || "No se pudo iniciar la generación del video")
      }

      const trackingData = {
        requestId: startData.requestId as string,
        statusUrl: startData.statusUrl as string,
        responseUrl: startData.responseUrl as string,
      }

      for (let attempt = 0; attempt < VIDEO_POLL_MAX_ATTEMPTS; attempt += 1) {
        await wait(VIDEO_POLL_INTERVAL_MS)
        if (runIdRef.current !== runId) return

        const statusResponse = await fetch("/api/video/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(trackingData),
        })

        const statusData = await statusResponse.json()
        if (!statusResponse.ok) {
          throw new Error(statusData.error || "No se pudo consultar el estado del video")
        }

        if (statusData.status === "processing") continue

        if (statusData.status === "completed" && typeof statusData.videoUrl === "string") {
          setVideoUrl(statusData.videoUrl)
          setVideoPhase("generated")
          toast.success("Video generado", {
            description: "Tu video está listo para descargar",
          })
          return
        }

        if (statusData.status === "error") {
          throw new Error(statusData.error || "No se pudo generar el video")
        }

        throw new Error("El servicio devolvió un estado de video inesperado")
      }

      throw new Error("La generación del video superó el tiempo máximo de espera")
    } catch (err) {
      if (runIdRef.current !== runId) return
      const message = err instanceof Error ? err.message : "Error de conexión"
      setVideoPhase("error")
      setVideoError(message)
      toast.error(message === "Sesión expirada" ? "Sesión expirada" : "Error al generar video", {
        description: message === "Sesión expirada" ? "Vuelve a iniciar sesión para continuar" : message,
      })
    } finally {
      if (runIdRef.current === runId) inFlightRef.current = false
    }
  }

  const resetVideo = () => {
    runIdRef.current += 1
    inFlightRef.current = false
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
