"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useCredits } from "@/lib/credits-context"
import { getVideoGenerationContext, type VideoGenerationContext } from "@/lib/video-generation-payload"
import { DEFAULT_VIDEO_MODEL, getVideoModel, isVideoModelId, type VideoModelId } from "@/lib/pricing-plans"

export type VideoPhase = "idle" | "generating" | "generated" | "error"
export type VideoGenerationOutcome =
  | { status: "generated"; videoUrl: string; assetId: string }
  | { status: "error"; error: string }
  | { status: "busy" }

const VIDEO_POLL_INTERVAL_MS = 5_000
const VIDEO_POLL_MAX_ATTEMPTS = 72
// Consecutive temporary STATUS failures tolerated before giving up (about one minute).
const VIDEO_POLL_MAX_TRANSIENT = 12

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/*
 * Paid video jobs survive a reload or a closed tab, even one that happens while
 * START is still running. Before START is sent, the request's idempotency key is
 * kept in this browser, per user, until STATUS gives a final answer. When the
 * editor opens again it keeps asking /api/video/status about that key: the
 * server finds the signed-in user's own START record (or answers that START has
 * not reached it yet), stores the clip or refunds a definitive failure. START is
 * never called again and nothing is reserved or charged again. Only the key, the
 * tier and the start time are stored: no tokens and no URLs. Recovery needs the
 * user to come back to the editor in this browser; there is no server-side recovery.
 */
const PENDING_PREFIX = "pixelfm:video-pending:"
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
// How long a key may stay unknown to the server before it is forgotten. START records the
// key as soon as it arrives, so a key still unknown after this never reached the server and charged nothing.
const START_GRACE_MS = 5 * 60 * 1000
// START answers that mean no job exists for this key (invalid, unauthorized, no credits, rejected, rate limited).
const START_NO_JOB_STATUSES = [400, 401, 402, 409, 429]

type Tracking = { requestId: string; statusUrl: string; responseUrl: string }
/** New entries carry only idempotencyKey; entries saved by the previous version carry START's tracking data. */
type PendingJob = { model: VideoModelId; startedAt: number; credits?: number } & ({ idempotencyKey: string } | Tracking)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const jobId = (job: PendingJob) => ("idempotencyKey" in job ? job.idempotencyKey : job.requestId)
const statusQuery = (job: PendingJob) => ("idempotencyKey" in job
  ? { idempotencyKey: job.idempotencyKey }
  : { requestId: job.requestId, statusUrl: job.statusUrl, responseUrl: job.responseUrl })

const pendingKey = (userId: string) => `${PENDING_PREFIX}${userId}`

const isPendingJob = (value: unknown): value is PendingJob => {
  if (typeof value !== "object" || value === null) return false
  const job = value as Record<string, unknown>
  if (!isVideoModelId(job.model) || typeof job.startedAt !== "number" || !Number.isFinite(job.startedAt)) return false
  if (typeof job.idempotencyKey === "string") return UUID.test(job.idempotencyKey)
  return typeof job.requestId === "string" && typeof job.statusUrl === "string" && typeof job.responseUrl === "string"
}

function readPendingJobs(userId: string): PendingJob[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(pendingKey(userId)) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter(isPendingJob) : []
  } catch {
    return []
  }
}

function writePendingJobs(userId: string, jobs: PendingJob[]) {
  try {
    if (jobs.length === 0) localStorage.removeItem(pendingKey(userId))
    else localStorage.setItem(pendingKey(userId), JSON.stringify(jobs))
  } catch {
    // Storage unavailable (private mode, quota): tracking stays in memory only.
  }
}

function rememberPendingJob(userId: string, job: PendingJob) {
  writePendingJobs(userId, [...readPendingJobs(userId).filter((item) => jobId(item) !== jobId(job)), job])
}

function forgetPendingJob(userId: string, id: string) {
  writePendingJobs(userId, readPendingJobs(userId).filter((item) => jobId(item) !== id))
}

// Jobs this page is polling (and how each poll knows it was stopped), so a resume never duplicates a live poll.
const activePolls = new Map<string, () => boolean>()
const isPolling = (id: string) => {
  const stopped = activePolls.get(id)
  return Boolean(stopped && !stopped())
}

type PollResult =
  | { kind: "completed"; videoUrl: string; assetId: string }
  /** final: STATUS answered for good (keep no tracking); otherwise the job may still be followed later. */
  | { kind: "error"; error: string; final: boolean; remainingCredits?: number }
  /** STATUS will never follow this job (closed, another user's, malformed, never started): forget it. */
  | { kind: "gone"; error: string }
  | { kind: "stopped" }

const validBalance = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0

/** Polls one job through STATUS only. It never starts, submits or charges anything. */
async function pollVideoJob(job: PendingJob, accessToken: string, stopped: () => boolean, startGraceMs: number): Promise<PollResult> {
  let transientFailures = 0
  let lastTransientError = ""
  for (let attempt = 0; attempt < VIDEO_POLL_MAX_ATTEMPTS; attempt += 1) {
    await wait(VIDEO_POLL_INTERVAL_MS)
    if (stopped()) return { kind: "stopped" }

    // Network drops, n8n 500s and non-definitive errors say nothing final about
    // the job: poll the same job again (STATUS never submits a new one).
    let transientMessage: string | null = null
    let statusResponse: Response | null = null
    let statusData: Record<string, unknown> | null = null
    try {
      statusResponse = await fetch("/api/video/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(statusQuery(job)),
      })
      const body: unknown = await statusResponse.json().catch(() => null)
      statusData = typeof body === "object" && body !== null ? body as Record<string, unknown> : null
    } catch {
      transientMessage = "No se pudo consultar el estado del video"
    }
    const errorText = typeof statusData?.error === "string" ? statusData.error : ""
    if (!transientMessage && !statusData) transientMessage = "No se pudo consultar el estado del video"
    // Includes a refund the server could not confirm yet: polling retries it.
    if (!transientMessage && statusData?.retry === true) transientMessage = errorText || "No se pudo consultar el estado del video"
    if (transientMessage) {
      transientFailures += 1
      lastTransientError = transientMessage
      if (transientFailures > VIDEO_POLL_MAX_TRANSIENT) return { kind: "error", error: lastTransientError, final: false }
      continue
    }
    transientFailures = 0
    if (!statusResponse || !statusData) continue

    if (!statusResponse.ok) {
      const error = errorText || "No se pudo consultar el estado del video"
      // 400/403/409: STATUS will never follow this job (closed, not this user's, or malformed).
      return [400, 403, 409].includes(statusResponse.status) ? { kind: "gone", error } : { kind: "error", error, final: false }
    }

    // START has not recorded this key yet: keep waiting until it could no longer arrive.
    if (statusData.status === "not_started") {
      if (Date.now() - job.startedAt >= startGraceMs) return { kind: "gone", error: "La generación no llegó a iniciarse" }
      continue
    }

    if (statusData.status === "processing") continue

    if (statusData.status === "completed" && typeof statusData.videoUrl === "string" && typeof statusData.assetId === "string") {
      return { kind: "completed", videoUrl: statusData.videoUrl, assetId: statusData.assetId }
    }

    if (statusData.status === "error") {
      if (statusData.refunded === true) {
        return {
          kind: "error",
          error: `${errorText || "No se pudo generar el video"}. Te devolvimos ${job.credits ?? getVideoModel(job.model).credits} créditos.`,
          final: true,
          remainingCredits: validBalance(statusData.remainingCredits) ? statusData.remainingCredits : undefined,
        }
      }
      return { kind: "error", error: errorText || "No se pudo generar el video", final: true }
    }

    return { kind: "error", error: "El servicio devolvió un estado de video inesperado", final: false }
  }

  return { kind: "error", error: "La generación del video superó el tiempo máximo de espera", final: false }
}

/** Follows one job and forgets its stored tracking once STATUS answered for good. */
async function followVideoJob(
  userId: string,
  job: PendingJob,
  accessToken: string,
  stopped: () => boolean,
  startGraceMs = START_GRACE_MS,
): Promise<PollResult> {
  const id = jobId(job)
  activePolls.set(id, stopped)
  try {
    const result = await pollVideoJob(job, accessToken, stopped, startGraceMs)
    if (result.kind === "completed" || result.kind === "gone" || (result.kind === "error" && result.final)) forgetPendingJob(userId, id)
    return result
  } finally {
    if (activePolls.get(id) === stopped) activePolls.delete(id)
  }
}

/*
 * The signed-in user's open jobs as the server records them, so a job is found even
 * without this browser's storage (other device, storage cleared, reload before the
 * key was kept). Read only; any failure just leaves recovery to the stored keys.
 */
type ServerJob = { job: PendingJob; requestId: string | null }

async function discoverServerJobs(accessToken: string): Promise<ServerJob[]> {
  try {
    const response = await fetch("/api/video/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ list: true }),
    })
    const body: unknown = await response.json().catch(() => null)
    const jobs = response.ok && typeof body === "object" && body !== null ? (body as Record<string, unknown>).jobs : null
    if (!Array.isArray(jobs)) return []
    return jobs.flatMap((item): ServerJob[] => {
      const job = typeof item === "object" && item !== null ? item as Record<string, unknown> : {}
      const startedAt = typeof job.startedAt === "string" ? Date.parse(job.startedAt) : NaN
      if (typeof job.idempotencyKey !== "string" || !UUID.test(job.idempotencyKey) || !Number.isFinite(startedAt)) return []
      const credits = typeof job.credits === "number" && Number.isInteger(job.credits) && job.credits > 0 ? job.credits : undefined
      const model: VideoModelId = credits === getVideoModel("premium").credits ? "premium" : DEFAULT_VIDEO_MODEL
      const requestId = typeof job.requestId === "string" ? job.requestId : null
      return [{ job: { idempotencyKey: job.idempotencyKey, model, startedAt, ...(credits ? { credits } : {}) }, requestId }]
    })
  } catch {
    return []
  }
}

export function useVideoGenerator() {
  const { setCredits } = useCredits()
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null)
  const [videoPhase, setVideoPhase] = useState<VideoPhase>("idle")
  const [videoError, setVideoError] = useState<string | null>(null)
  const runIdRef = useRef(0)
  const inFlightRef = useRef(false)
  const pendingStartRef = useRef<{ payload: string; key: string } | null>(null)

  useEffect(() => () => {
    runIdRef.current += 1
    inFlightRef.current = false
  }, [])

  // Resumes the signed-in user's jobs left pending by an earlier visit, in the background.
  useEffect(() => {
    let cancelled = false
    const stopped = () => cancelled
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user.id
      const accessToken = session?.access_token
      if (cancelled || !userId || !accessToken) return

      const now = Date.now()
      const jobs = readPendingJobs(userId)
      const fresh = jobs.filter((job) => now - job.startedAt < PENDING_MAX_AGE_MS)
      if (fresh.length !== jobs.length) writePendingJobs(userId, fresh)

      // Jobs the server still has open for this user, also when this browser kept nothing.
      const serverJobs = await discoverServerJobs(accessToken)
      if (cancelled) return
      const localIds = new Set(fresh.map(jobId))
      const discovered = serverJobs
        .filter(({ job, requestId }) => !localIds.has(jobId(job)) && !(requestId && localIds.has(requestId)))
        .map(({ job }) => job)

      // Every job at once: one slow job never delays another one's result.
      await Promise.all([...fresh, ...discovered].map(async (job) => {
        if (cancelled || isPolling(jobId(job))) return
        const result = await followVideoJob(userId, job, accessToken, stopped)
        if (cancelled || result.kind === "stopped") return
        if (result.kind === "completed") {
          toast.success("Tu video pendiente está listo", { description: "Lo guardamos en tu Biblioteca." })
        } else if (result.kind === "error" && result.final) {
          if (result.remainingCredits !== undefined) setCredits(result.remainingCredits)
          toast.error("Un video pendiente no se pudo generar", { description: result.error })
        }
      }))
    })()
    return () => { cancelled = true }
  }, [setCredits])

  const generateVideo = async (
    imageUrl: string,
    angle: string,
    hook: string,
    style: string,
    context: VideoGenerationContext = {},
    model: VideoModelId = DEFAULT_VIDEO_MODEL,
  ): Promise<VideoGenerationOutcome> => {
    if (!imageUrl) {
      toast.error("Genera un creativo primero")
      return { status: "error", error: "Genera un creativo primero" }
    }
    if (!angle) {
      toast.error("Selecciona un ángulo de venta")
      return { status: "error", error: "Selecciona un ángulo de venta" }
    }
    if (inFlightRef.current) return { status: "busy" }

    const runId = ++runIdRef.current
    inFlightRef.current = true
    setVideoPhase("generating")
    setVideoError(null)
    setVideoUrl(null)
    setVideoAssetId(null)

    // The tier is part of the request: switching it never reuses another tier's key.
    const startPayload = { imageUrl, angle, hook, style, ...getVideoGenerationContext(context), model }
    const payloadSignature = JSON.stringify(startPayload)
    const previousAttempt = pendingStartRef.current
    const attempt = previousAttempt?.payload === payloadSignature
      ? previousAttempt
      : { payload: payloadSignature, key: crypto.randomUUID() }
    pendingStartRef.current = attempt

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      const userId = session?.user.id

      if (!accessToken || !userId) {
        throw new Error("Sesión expirada")
      }

      // Kept before START is sent: a reload while START is still running can then find the job.
      const job: PendingJob = { idempotencyKey: attempt.key, model, startedAt: Date.now() }
      rememberPendingJob(userId, job)

      let startResponse: Response | null = null
      let startData: Record<string, unknown> | null = null
      try {
        startResponse = await fetch("/api/video/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ...startPayload, idempotencyKey: attempt.key }),
        })
        const body: unknown = await startResponse.json().catch(() => null)
        startData = typeof body === "object" && body !== null ? body as Record<string, unknown> : null
      } catch {
        // The answer was lost, but START may have run: the job is followed by its key below.
      }
      const startError = typeof startData?.error === "string" ? startData.error : "No se pudo iniciar la generación del video"

      if (startResponse && START_NO_JOB_STATUSES.includes(startResponse.status)) {
        // Solo una respuesta que confirma que no hubo START permite abandonar la key.
        pendingStartRef.current = null
        forgetPendingJob(userId, attempt.key)
        throw new Error(startError)
      }

      const started = Boolean(startResponse?.ok && startData?.success === true && startData?.status === "processing" &&
        typeof startData?.requestId === "string")
      if (started) {
        pendingStartRef.current = null
        if (validBalance(startData?.remainingCredits)) setCredits(startData.remainingCredits)
      }

      // Started, still starting, or unknown: STATUS finds the job by its key and never starts another one.
      // Leaving the editor stops only this page's polling; the stored key is resumed on return.
      // When START already answered, a key the server does not know was never claimed: no wait needed.
      const result = await followVideoJob(userId, job, accessToken, () => runIdRef.current !== runId, startResponse ? 0 : START_GRACE_MS)
      if (result.kind === "stopped") return { status: "busy" }

      if (result.kind === "completed") {
        pendingStartRef.current = null
        setVideoUrl(result.videoUrl)
        setVideoAssetId(result.assetId)
        setVideoPhase("generated")
        toast.success("Video generado", {
          description: "Tu video está listo para descargar",
        })
        return { status: "generated", videoUrl: result.videoUrl, assetId: result.assetId }
      }

      if (result.kind === "error" && result.remainingCredits !== undefined) setCredits(result.remainingCredits)
      // A job that never started (START failed and returned its credits) shows START's own message.
      if (result.kind === "gone") {
        pendingStartRef.current = null
        throw new Error(started ? result.error : startError)
      }
      if (result.kind === "error" && result.final) pendingStartRef.current = null
      throw new Error(result.error)
    } catch (err) {
      if (runIdRef.current !== runId) return { status: "busy" }
      const message = err instanceof Error ? err.message : "Error de conexión"
      setVideoPhase("error")
      setVideoError(message)
      toast.error(message === "Sesión expirada" ? "Sesión expirada" : "Error al generar video", {
        description: message === "Sesión expirada" ? "Vuelve a iniciar sesión para continuar" : message,
      })
      return { status: "error", error: message }
    } finally {
      if (runIdRef.current === runId) inFlightRef.current = false
    }
  }

  const resetVideo = () => {
    runIdRef.current += 1
    inFlightRef.current = false
    setVideoUrl(null)
    setVideoAssetId(null)
    setVideoPhase("idle")
    setVideoError(null)
  }

  return {
    videoUrl,
    videoAssetId,
    videoPhase,
    videoError,
    generateVideo,
    resetVideo,
  }
}
