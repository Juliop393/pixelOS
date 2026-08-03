import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ALLOWED_ANGLES = [
  "comparison", "problem-solution", "primary-benefit", "social-proof",
  "product-demo", "usage-experience", "offer-convenience", "unique-mechanism",
]

const ALLOWED_STYLES = [
  "white-bg", "lifestyle", "product-action", "b2b",
  "premium-editorial", "benefits-infographic", "direct-offer", "minimal-tech",
]

const ALLOWED_FORMATS = ["square", "story", "4:5"]

const ANGLE_NAMES: Record<string, string> = {
  "comparison": "Contraste competitivo",
  "problem-solution": "Problema y solución",
  "primary-benefit": "Beneficio principal",
  "social-proof": "Prueba social",
  "product-demo": "Demostración del producto",
  "usage-experience": "Experiencia de uso",
  "offer-convenience": "Oferta y conveniencia",
  "unique-mechanism": "Mecanismo único",
}

const STYLE_NAMES: Record<string, string> = {
  "white-bg": "Fondo de estudio",
  "lifestyle": "Lifestyle y contexto",
  "product-action": "Producto en acción",
  "b2b": "Comercial B2B",
  "premium-editorial": "Premium editorial",
  "benefits-infographic": "Infografía de beneficios",
  "direct-offer": "Oferta y venta directa",
  "minimal-tech": "Minimalista tecnológico",
}

const RATE_LIMIT_WINDOW_SHORT = 5 * 60 * 1000   // 5 minutes
const RATE_LIMIT_MAX_SHORT = 8
const RATE_LIMIT_WINDOW_DAY = 24 * 60 * 60 * 1000
const RATE_LIMIT_MAX_DAY = 40
const MAX_MESSAGES = 10
const MAX_CHARS_PER_MESSAGE = 2000
const MAX_COMBINED_CHARS = 6000

const CHAT_SYSTEM_PROMPT = `Eres Pixel IA, un asesor de estrategia publicitaria para Meta Ads.

Tu trabajo es conversar con el usuario para entender su negocio ANTES de recomendar ángulos.

Información mínima necesaria:
- ¿Qué producto o servicio vende?
- ¿A qué público se dirige?
- ¿Qué quiere conseguir con el anuncio? (ventas, cotizaciones, leads, etc.)

No hagas recomendaciones todavía. Solo conversa para recopilar información.

Reglas:
- Sé breve, natural y en español.
- Haz máximo una pregunta por mensaje.
- Si el usuario solo saluda, preséntate y pregúntale por su producto.
- Si falta información, pregunta solo por lo que falta.
- No repitas preguntas que el usuario ya respondió.
- No inventes información.
- Cuando tengas producto, público y objetivo, responde ÚNICAMENTE con un JSON como este:

{
  "readyToConfirm": true,
  "message": "Entendí que vendes [producto] a [público] y buscas [objetivo]. ¿Está correcto?",
  "collectedContext": {
    "product": "producto descrito",
    "audience": "público descrito",
    "goal": "objetivo descrito"
  }
}

Si aún falta información, responde con:

{
  "readyToConfirm": false,
  "message": "¿A qué tipo de clientes te diriges?",
  "collectedContext": {
    "product": "...",
    "audience": null,
    "goal": "..."
  }
}

En TODOS los casos, tu respuesta debe ser un JSON válido.`

const RECOMMEND_SYSTEM_PROMPT = `Eres Pixel IA, un asesor de estrategia publicitaria para Meta Ads.

El usuario ya confirmó la siguiente información sobre su negocio. Ahora debes recomendar exactamente 3 ángulos de venta.

Ángulos disponibles:
1. comparison — Contraste competitivo
2. problem-solution — Problema y solución
3. primary-benefit — Beneficio principal
4. social-proof — Prueba social
5. product-demo — Demostración del producto
6. usage-experience — Experiencia de uso
7. offer-convenience — Oferta y conveniencia
8. unique-mechanism — Mecanismo único

Estilos visuales: white-bg, lifestyle, product-action, b2b, premium-editorial, benefits-infographic, direct-offer, minimal-tech
Formatos: square (1:1), story (9:16), 4:5 (4:5)
safeZoneMeta: solo true si formato es story.

Responde ÚNICAMENTE con JSON:
{
  "summary": "Análisis breve",
  "productDescription": "Descripción clara del producto, público y modalidad. Máx 180 caracteres.",
  "recommendations": [
    {
      "angleId": "problem-solution",
      "angleName": "Problema y solución",
      "reason": "Explicación breve",
      "styleId": "lifestyle",
      "styleName": "Lifestyle y contexto",
      "format": "story",
      "safeZoneMeta": true
    }
  ]
}

productDescription debe ser claro, específico, incluir qué se vende y para quién, máximo 180 caracteres, sin inventar precios ni cifras.

3 recomendaciones distintas, sin inventar datos.`

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number; reason?: string }> {
  const admin = getAdminClient()
  const now = new Date()
  const shortAgo = new Date(now.getTime() - RATE_LIMIT_WINDOW_SHORT).toISOString()
  const dayAgo = new Date(now.getTime() - RATE_LIMIT_WINDOW_DAY).toISOString()

  const { count: shortCount, error: shortErr } = await admin
    .from("api_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", "pixel-ai")
    .gte("created_at", shortAgo)

  if (shortErr) throw shortErr

  if ((shortCount ?? 0) >= RATE_LIMIT_MAX_SHORT) {
    return {
      allowed: false,
      retryAfter: RATE_LIMIT_WINDOW_SHORT / 1000,
      reason: "Has enviado demasiados mensajes seguidos. Espera unos minutos e inténtalo nuevamente.",
    }
  }

  const { count: dayCount, error: dayErr } = await admin
    .from("api_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", "pixel-ai")
    .gte("created_at", dayAgo)

  if (dayErr) throw dayErr

  if ((dayCount ?? 0) >= RATE_LIMIT_MAX_DAY) {
    return {
      allowed: false,
      reason: "Alcanzaste el límite diario de Pixel IA. Podrás volver a usarlo más adelante.",
    }
  }

  return { allowed: true }
}

async function recordRequest(userId: string) {
  const admin = getAdminClient()
  await admin.from("api_rate_limits").insert({ user_id: userId, endpoint: "pixel-ai" })

  // Periodic cleanup (~10% chance): delete records older than 48 hours
  if (Math.random() < 0.1) {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    await admin.from("api_rate_limits").delete().lt("created_at", cutoff).eq("endpoint", "pixel-ai")
  }
}

function validateBody(body: unknown): { valid: true; action: "chat"; messages: Array<{ role: string; content: string }> } | { valid: true; action: "recommend"; collectedContext: { product: string; audience: string; goal: string } } | { valid: false; error: string; status: number } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Cuerpo de solicitud inválido", status: 400 }
  }

  const b = body as Record<string, unknown>
  const action = b.action === "recommend" ? "recommend" : "chat"

  if (action === "chat") {
    if (!Array.isArray(b.messages)) {
      return { valid: false, error: "El campo messages debe ser un array", status: 400 }
    }

    const messages: Array<{ role: string; content: string }> = []
    for (const m of b.messages) {
      if (typeof m !== "object" || m === null) {
        return { valid: false, error: "Cada mensaje debe ser un objeto", status: 400 }
      }
      const msg = m as Record<string, unknown>
      if (typeof msg.content !== "string") {
        return { valid: false, error: "El contenido de cada mensaje debe ser texto", status: 400 }
      }
      if ((msg.content as string).length > MAX_CHARS_PER_MESSAGE) {
        return { valid: false, error: `Cada mensaje no puede superar los ${MAX_CHARS_PER_MESSAGE} caracteres`, status: 400 }
      }
      const role = msg.role === "assistant" ? "assistant" : "user"
      messages.push({ role, content: msg.content as string })
    }

    if (messages.length === 0) {
      return { valid: false, error: "Envía al menos un mensaje", status: 400 }
    }

    if (messages.length > MAX_MESSAGES) {
      return { valid: false, error: `No se permiten más de ${MAX_MESSAGES} mensajes por solicitud`, status: 400 }
    }

    const sliced = messages.slice(-MAX_MESSAGES)
    return { valid: true, action: "chat", messages: sliced }
  }

  // action === "recommend"
  const context = (typeof b.collectedContext === "object" && b.collectedContext !== null
    ? b.collectedContext
    : {}) as Record<string, unknown>

  const product = typeof context.product === "string" ? context.product : ""
  const audience = typeof context.audience === "string" ? context.audience : ""
  const goal = typeof context.goal === "string" ? context.goal : ""

  const combined = (product + audience + goal).length
  if (combined > MAX_COMBINED_CHARS) {
    return { valid: false, error: `La descripción combinada no puede superar los ${MAX_COMBINED_CHARS} caracteres`, status: 400 }
  }

  if (!product || !audience || !goal) {
    return { valid: false, error: "Falta información del producto, público u objetivo", status: 400 }
  }

  return { valid: true, action: "recommend", collectedContext: { product, audience, goal } }
}

async function callKimi(messages: Array<{ role: string; content: string }>, jsonMode: boolean): Promise<{ ok: boolean; status: number; data: Record<string, unknown> } | null> {
  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    const body: Record<string, unknown> = {
      model: "kimi-k2.6",
      messages,
      max_completion_tokens: jsonMode ? 1200 : 600,
      temperature: 0.6,
      thinking: { type: "disabled" },
    }
    if (jsonMode) {
      body.response_format = { type: "json_object" }
    }

    const kimiRes = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const kimiData = await kimiRes.json()
    return { ok: kimiRes.ok, status: kimiRes.status, data: kimiData }
  } catch {
    clearTimeout(timeout)
    return null
  }
}

export async function POST(req: NextRequest) {
  const cacheHeaders = { "Cache-Control": "no-store" }

  // ---- Auth ----
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: cacheHeaders })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401, headers: cacheHeaders })
  }

  // ---- Body validation ----
  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: cacheHeaders })
  }

  const validation = validateBody(rawBody)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: validation.status, headers: cacheHeaders })
  }

  // ---- Rate limit check ----
  try {
    const limitResult = await checkRateLimit(user.id)
    if (!limitResult.allowed) {
      const headers: Record<string, string> = { ...cacheHeaders }
      if (limitResult.retryAfter) {
        headers["Retry-After"] = String(limitResult.retryAfter)
      }
      return NextResponse.json({ error: limitResult.reason }, { status: 429, headers })
    }
  } catch (e) {
    console.error("Rate limit check failed:", e)
    return NextResponse.json({ error: "Error interno al verificar límites" }, { status: 500, headers: cacheHeaders })
  }

  // ---- Record the request ----
  recordRequest(user.id).catch((e) => console.error("Rate limit record failed:", e))

  // ---- Chat action ----
  if (validation.action === "chat") {
    const apiMessages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...validation.messages,
    ]

    const result = await callKimi(apiMessages, true)

    if (!result) {
      return NextResponse.json({ error: "Error al conectar con el servicio de IA" }, { status: 502, headers: cacheHeaders })
    }

    if (!result.ok) {
      return NextResponse.json({ error: "El servicio de IA no pudo procesar tu mensaje" }, { status: 502, headers: cacheHeaders })
    }

    const rawContent = (result.data as any)?.choices?.[0]?.message?.content as string | undefined
    if (typeof rawContent !== "string") {
      return NextResponse.json({ error: "Respuesta inesperada del servicio de IA" }, { status: 502, headers: cacheHeaders })
    }

    try {
      const parsed = JSON.parse(rawContent) as Record<string, unknown>
      return NextResponse.json(
        {
          type: parsed.readyToConfirm ? "confirmation" : "question",
          message: typeof parsed.message === "string" ? parsed.message : "¿En qué más puedo ayudarte?",
          collectedContext: parsed.collectedContext ?? {},
        },
        { headers: cacheHeaders }
      )
    } catch {
      return NextResponse.json(
        { type: "question", message: rawContent, collectedContext: {} },
        { headers: cacheHeaders }
      )
    }
  }

  // ---- Recommend action ----
  const { product, audience, goal } = validation.collectedContext
  const description = `Producto: ${product}\nPúblico: ${audience}\nObjetivo: ${goal}`

  const apiMessages = [
    { role: "system", content: RECOMMEND_SYSTEM_PROMPT },
    { role: "user", content: description },
  ]

  const result = await callKimi(apiMessages, true)

  if (!result) {
    return NextResponse.json({ error: "Error al conectar con el servicio de IA" }, { status: 502, headers: cacheHeaders })
  }

  if (!result.ok) {
    return NextResponse.json({ error: "El servicio de IA no pudo procesar tu solicitud" }, { status: 502, headers: cacheHeaders })
  }

  const rawContent = (result.data as any)?.choices?.[0]?.message?.content as string | undefined
  if (typeof rawContent !== "string") {
    return NextResponse.json({ error: "Respuesta inesperada del servicio de IA" }, { status: 502, headers: cacheHeaders })
  }

  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(rawContent) } catch {
    return NextResponse.json({ error: "El servicio de IA devolvió un formato inesperado" }, { status: 502, headers: cacheHeaders })
  }

  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
  if (recommendations.length < 3) {
    return NextResponse.json({ error: "El servicio de IA no generó suficientes recomendaciones" }, { status: 502, headers: cacheHeaders })
  }

  const validated = recommendations.slice(0, 3).map((rec: unknown, idx: number) => {
    const r = rec as Record<string, unknown>
    const angleId = typeof r.angleId === "string" && ALLOWED_ANGLES.includes(r.angleId) ? r.angleId : ALLOWED_ANGLES[idx]
    const styleId = typeof r.styleId === "string" && ALLOWED_STYLES.includes(r.styleId) ? r.styleId : "lifestyle"
    const format = typeof r.format === "string" && ALLOWED_FORMATS.includes(r.format) ? r.format : "square"
    const safeZoneMeta = format === "story" ? r.safeZoneMeta === true : false

    return {
      angleId,
      angleName: ANGLE_NAMES[angleId] ?? angleId,
      reason: typeof r.reason === "string" && r.reason.length > 0 ? r.reason : "Recomendación basada en tu descripción.",
      styleId,
      styleName: STYLE_NAMES[styleId] ?? styleId,
      format,
      safeZoneMeta,
    }
  })

  return NextResponse.json(
    {
      type: "recommendations",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      productDescription: typeof parsed.productDescription === "string" ? parsed.productDescription.slice(0, 180) : "",
      recommendations: validated,
    },
    { headers: cacheHeaders }
  )
}