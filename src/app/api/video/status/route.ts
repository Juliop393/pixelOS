import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"
import { refundVideoReservation, videoReservationKey } from "@/lib/video-credits"

const N8N_STATUS_TIMEOUT_MS = 30_000
const VIDEO_DOWNLOAD_TIMEOUT_MS = 120_000
const MAX_VIDEO_BYTES = 80 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60
const VIDEO_BUCKET = "videos"
const headersNoStore = { "Cache-Control": "no-store" }

function isSafeHttpsUrl(value: string): boolean {
  if (!value || value.length > 2048) return false

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return false
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) return false
    if (url.hostname.match(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/)) return false
    return true
  } catch {
    return false
  }
}

function isFalVideoUrl(value: string): boolean {
  if (!isSafeHttpsUrl(value)) return false
  const url = new URL(value)
  return (url.hostname === "fal.media" || url.hostname.endsWith(".fal.media")) && !url.port
}

async function getStoredScene(admin: ReturnType<typeof createAdminClient>, userId: string, storagePath: string) {
  const { data, error } = await admin.from("creative_assets")
    .select("id")
    .eq("user_id", userId)
    .eq("bucket", VIDEO_BUCKET)
    .eq("storage_path", storagePath)
    .eq("media_type", "video")
    .eq("kind", "scene")
    .maybeSingle()
  if (error) throw new Error("catalog_read_failed")
  return data
}

async function signStoredScene(admin: ReturnType<typeof createAdminClient>, assetId: string, storagePath: string) {
  const { data, error } = await admin.storage.from(VIDEO_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) throw new Error("signed_url_failed")
  return { assetId, videoUrl: data.signedUrl }
}

const scenePath = (userId: string, requestId: string) =>
  `${userId}/scenes/${createHash("sha256").update(requestId).digest("hex")}.mp4`

async function persistScene(admin: ReturnType<typeof createAdminClient>, userId: string, requestId: string, sourceUrl: string) {
  const storagePath = scenePath(userId, requestId)
  const existing = await getStoredScene(admin, userId, storagePath)
  if (existing) return signStoredScene(admin, existing.id, storagePath)
  if (!isFalVideoUrl(sourceUrl)) throw new Error("invalid_source_url")

  const source = await fetch(sourceUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(VIDEO_DOWNLOAD_TIMEOUT_MS),
  })
  if (!source.ok || !source.body) throw new Error("source_download_failed")
  const contentType = source.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase()
  if (contentType && contentType !== "video/mp4" && contentType !== "application/octet-stream") {
    throw new Error("invalid_video_type")
  }
  const contentLength = Number(source.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) throw new Error("video_too_large")

  const reader = source.body.getReader()
  const chunks: Buffer[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > MAX_VIDEO_BYTES) {
        await reader.cancel()
        throw new Error("video_too_large")
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  const mp4 = Buffer.concat(chunks, byteLength)
  if (mp4.length < 12 || mp4.toString("ascii", 4, 8) !== "ftyp") throw new Error("invalid_mp4")

  const { error: uploadError } = await admin.storage.from(VIDEO_BUCKET).upload(storagePath, mp4, {
    contentType: "video/mp4",
    upsert: false,
  })
  // Another STATUS request may have already uploaded this deterministic object.
  if (uploadError && uploadError.statusCode !== "409") throw new Error("storage_upload_failed")

  const { data: inserted, error: insertError } = await admin.from("creative_assets")
    .insert({
      user_id: userId,
      media_type: "video",
      kind: "scene",
      bucket: VIDEO_BUCKET,
      storage_path: storagePath,
      public_url: null,
      metadata: { requestId, source: "fal.ai" },
    })
    .select("id")
    .single()
  if (insertError && insertError.code !== "23505") throw new Error("catalog_insert_failed")
  const asset = inserted ?? await getStoredScene(admin, userId, storagePath)
  if (!asset) throw new Error("catalog_insert_failed")
  return signStoredScene(admin, asset.id, storagePath)
}

/*
 * fal finished this job without a video: return its credits once and close the
 * request, so later polls cannot reach fal or refund again. A scene already
 * stored for the request is never refunded. When the refund cannot be confirmed
 * the request stays open and the client keeps polling, which retries it.
 */
async function refundDefinitiveFailure(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  requestId: string,
  idempotencyKey: string,
  error: string,
) {
  try {
    if (await getStoredScene(admin, userId, scenePath(userId, requestId))) {
      console.error("Video STATUS definitive failure for a stored scene; not refunded:", requestId)
      return NextResponse.json({ success: false, status: "error", error, refunded: false }, { status: 200, headers: headersNoStore })
    }
  } catch {
    return NextResponse.json({ error: "No pudimos confirmar la devolución de tus créditos. Seguimos intentándolo.", retry: true }, { status: 503, headers: headersNoStore })
  }

  const refund = await refundVideoReservation(userId, idempotencyKey)
  if (refund.status === "failed") {
    return NextResponse.json({ error: "No pudimos confirmar la devolución de tus créditos. Seguimos intentándolo.", retry: true }, { status: 503, headers: headersNoStore })
  }
  if (refund.status === "not_found") {
    // No reservation under this request's key (e.g. charged before keys were derived from the request), so
    // nothing can be refunded safely here. The request stays open as evidence ('started', no scene, failed in
    // this log) for manual reconciliation; it is never closed as if the credits had been settled.
    console.error("Video STATUS definitive failure without a refundable reservation:", requestId, "user:", userId)
    return NextResponse.json({
      success: false,
      status: "error",
      error: `${error}. No pudimos devolver tus créditos automáticamente: escríbenos a team@pixelfm.com y lo revisamos.`,
      refunded: false,
      refundPending: true,
    }, { status: 200, headers: headersNoStore })
  }

  const { error: closeError } = await admin.from("video_start_requests")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .eq("status", "started")
  // The credits are back either way; a later poll would only find them already refunded.
  if (closeError) console.error("Video STATUS failed-request update failed:", closeError.code)

  return NextResponse.json(
    { success: false, status: "error", error, refunded: true, remainingCredits: refund.balance },
    { status: 200, headers: headersNoStore },
  )
}

const OPEN_JOB_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
// START claims a request before it calls n8n (up to 6 minutes); a claim older than this never started a job.
const OPEN_CLAIM_WINDOW_MS = 10 * 60 * 1000
const OPEN_JOB_CANDIDATES = 25
const OPEN_JOB_MAX = 5

/*
 * The signed-in user's own video jobs that may still need STATUS: started in the
 * last 7 days with no stored scene (a definitive failure closes the request), or
 * claimed by a START that may still be running. Read only; the browser then follows
 * each one by its idempotency key, so nothing is started or charged again.
 */
async function listOpenJobs(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const now = Date.now()
  const { data: rows, error } = await admin.from("video_start_requests")
    .select("idempotency_key,request_id,status,created_at")
    .eq("user_id", userId)
    .in("status", ["started", "processing"])
    .gte("created_at", new Date(now - OPEN_JOB_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(OPEN_JOB_CANDIDATES)
  if (error) throw new Error("open_jobs_read_failed")

  const candidates = (rows ?? []).filter((row) => row.status === "started"
    ? typeof row.request_id === "string" && row.request_id.length > 0
    : now - new Date(row.created_at).getTime() < OPEN_CLAIM_WINDOW_MS)
  if (candidates.length === 0) return []

  const started = candidates.filter((row) => row.status === "started")
  const paths = started.map((row) => scenePath(userId, row.request_id))
  const stored = new Set<string>()
  if (paths.length > 0) {
    const { data: assets, error: assetsError } = await admin.from("creative_assets")
      .select("storage_path")
      .eq("user_id", userId)
      .eq("bucket", VIDEO_BUCKET)
      .eq("kind", "scene")
      .in("storage_path", paths)
    if (assetsError) throw new Error("open_jobs_read_failed")
    for (const asset of assets ?? []) stored.add(asset.storage_path)
  }

  const open = candidates
    .filter((row) => row.status !== "started" || !stored.has(scenePath(userId, row.request_id)))
    .slice(0, OPEN_JOB_MAX)
  if (open.length === 0) return []

  // The reserved amount tells the browser which tier it was (for its refund message only).
  const { data: reservations, error: reservationsError } = await admin.from("credit_reservations")
    .select("reservation_key,credits")
    .eq("user_id", userId)
    .in("reservation_key", open.map((row) => videoReservationKey(row.idempotency_key)))
  if (reservationsError) throw new Error("open_jobs_read_failed")
  const credits = new Map((reservations ?? []).map((row) => [row.reservation_key as string, row.credits as number]))

  return open.map((row) => ({
    idempotencyKey: row.idempotency_key as string,
    requestId: typeof row.request_id === "string" ? row.request_id : null,
    startedAt: row.created_at as string,
    credits: credits.get(videoReservationKey(row.idempotency_key)) ?? null,
  }))
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: headersNoStore })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: headersNoStore })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401, headers: headersNoStore })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: headersNoStore })
  }

  if (body.list === true) {
    try {
      const jobs = await listOpenJobs(createAdminClient(), user.id)
      return NextResponse.json({ success: true, jobs }, { status: 200, headers: headersNoStore })
    } catch {
      return NextResponse.json({ error: "No se pudieron consultar tus videos pendientes", retry: true }, { status: 503, headers: headersNoStore })
    }
  }

  /*
   * Two ways to name a job, both limited to the signed-in user's own START requests:
   *   - its tracking data (requestId, statusUrl, responseUrl), as START returned it;
   *   - its idempotency key alone, which the browser keeps before sending START, so a
   *     reload during START can still find the job. The tracking data then comes from
   *     the server's own record, never from the browser.
   */
  const keyLookup = body.idempotencyKey !== undefined
  const lookupKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().toLowerCase() : ""
  let requestId = typeof body.requestId === "string" ? body.requestId.trim() : ""
  let statusUrl = typeof body.statusUrl === "string" ? body.statusUrl.trim() : ""
  let responseUrl = typeof body.responseUrl === "string" ? body.responseUrl.trim() : ""

  if (keyLookup
    ? !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lookupKey)
    : !/^[A-Za-z0-9._:-]{1,256}$/.test(requestId) || !isSafeHttpsUrl(statusUrl) || !isSafeHttpsUrl(responseUrl)) {
    return NextResponse.json({ error: "Datos de seguimiento inválidos" }, { status: 400, headers: headersNoStore })
  }

  let admin: ReturnType<typeof createAdminClient>
  let idempotencyKey: string
  try {
    admin = createAdminClient()
    if (keyLookup) {
      const { data: start, error: lookupError } = await admin.from("video_start_requests")
        .select("status,request_id,status_url,response_url,idempotency_key")
        .eq("user_id", user.id)
        .eq("idempotency_key", lookupKey)
        .maybeSingle()
      if (lookupError) throw new Error("lookup_failed")
      // START has not reached the database yet (or never did): nothing is charged without this record.
      if (!start) return NextResponse.json({ success: false, status: "not_started" }, { status: 200, headers: headersNoStore })
      // START is still running: same answer as a job in progress.
      if (start.status === "processing") return NextResponse.json({ success: true, status: "processing" }, { status: 200, headers: headersNoStore })
      if (start.status !== "started" || !start.request_id || !start.status_url || !start.response_url) {
        return NextResponse.json({ error: "Esta solicitud de video ya terminó", status: "closed" }, { status: 409, headers: headersNoStore })
      }
      requestId = start.request_id
      statusUrl = start.status_url
      responseUrl = start.response_url
      idempotencyKey = start.idempotency_key
    } else {
      const { data: start, error: ownershipError } = await admin.from("video_start_requests")
        .select("status_url,response_url,idempotency_key")
        .eq("user_id", user.id)
        .eq("request_id", requestId)
        .eq("status", "started")
        .limit(1)
        .maybeSingle()
      if (ownershipError) throw new Error("ownership_check_failed")
      if (!start || start.status_url !== statusUrl || start.response_url !== responseUrl) {
        return NextResponse.json({ error: "Solicitud de video no autorizada" }, { status: 403, headers: headersNoStore })
      }
      idempotencyKey = start.idempotency_key
    }
  } catch {
    return NextResponse.json({ error: "No se pudo verificar la solicitud de video" }, { status: 503, headers: headersNoStore })
  }

  const n8nStatusUrl = process.env.N8N_VIDEO_STATUS_WEBHOOK_URL
  const internalSecret = (process.env.N8N_INTERNAL_SECRET ?? "").trim()
  if (!n8nStatusUrl || !internalSecret) {
    return NextResponse.json({ error: "Servicio de estado de video no configurado" }, { status: 500, headers: headersNoStore })
  }

  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), N8N_STATUS_TIMEOUT_MS)

    const n8nResponse = await fetch(n8nStatusUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PixelFM-Secret": internalSecret,
      },
      body: JSON.stringify({ requestId, statusUrl, responseUrl }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    /*
     * retry: true marks answers that say nothing final about the job (n8n down,
     * HTTP 500, non-JSON, a non-definitive error): the client keeps polling the
     * same job. STATUS only reads; it never submits to fal again.
     */
    const contentType = n8nResponse.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ error: "Respuesta inesperada del servicio de estado", retry: true }, { status: 502, headers: headersNoStore })
    }

    const n8nData = await n8nResponse.json()
    if (!n8nResponse.ok || typeof n8nData !== "object" || n8nData === null) {
      return NextResponse.json({ error: "El servicio de estado no pudo procesar la solicitud", retry: true }, { status: 502, headers: headersNoStore })
    }

    const data = n8nData as Record<string, unknown>
    if (data.status === "processing") {
      return NextResponse.json({ success: true, status: "processing" }, { status: 200, headers: headersNoStore })
    }

    if (data.status === "completed" && typeof data.videoUrl === "string" && isSafeHttpsUrl(data.videoUrl)) {
      try {
        const stored = await persistScene(admin, user.id, requestId, data.videoUrl)
        return NextResponse.json({ success: true, status: "completed", ...stored }, { status: 200, headers: headersNoStore })
      } catch (error) {
        const reason = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "unexpected"
        console.error("Video STATUS clip persistence failed:", reason)
        return NextResponse.json(
          { success: false, status: "error", error: "El video se generó, pero no se pudo guardar. Intenta consultar el estado de nuevo.", retry: true },
          { status: 502, headers: headersNoStore }
        )
      }
    }

    if (data.status === "error") {
      const error = typeof data.error === "string" ? data.error.slice(0, 500) : "No se pudo generar el video"
      // Only a failure n8n marks as definitive (fal finished the job without a video) is refunded.
      if (data.definitive !== true) {
        return NextResponse.json({ success: false, status: "error", error, retry: true }, { status: 200, headers: headersNoStore })
      }
      return await refundDefinitiveFailure(admin, user.id, requestId, idempotencyKey, error)
    }

    return NextResponse.json({ error: "Estado de video inesperado", retry: true }, { status: 502, headers: headersNoStore })
  } catch (error: unknown) {
    if (timeout) clearTimeout(timeout)
    const isAbort = error instanceof DOMException && error.name === "AbortError"
    return NextResponse.json(
      { error: isAbort ? "La consulta de estado tardó demasiado" : "Error al consultar el estado del video", retry: true },
      { status: 502, headers: headersNoStore }
    )
  }
}
