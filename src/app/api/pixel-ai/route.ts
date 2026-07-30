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

const CHAT_SYSTEM_PROMPT = `Eres Pixel IA, un asesor amable de estrategia publicitaria para Meta Ads.

Tu trabajo es conversar con el usuario para entender su negocio antes de recomendar ángulos.

Información mínima que necesitas:
- Qué producto o servicio vende
- A quién se lo vende (público objetivo)
- Qué quiere conseguir con el anuncio (objetivo / forma de venta)

Información opcional pero útil:
- Principal beneficio
- Problema que resuelve
- B2B o B2C
- Canal de conversión
- Mercado o ubicación

Comportamiento:
- Si el usuario solo saluda, responde naturalmente y pide información.
- Si la información es parcial, pregunta solo por lo que falta. Sé breve.
- Si ya tienes lo necesario, da un resumen claro de lo que entendiste y PREGUNTA si está correcto.
- NO generes recomendaciones de ángulos en esta fase.
- Responde en español, con frases cortas y amables.
- Máximo 3 oraciones por respuesta.

Responde ÚNICAMENTE con este JSON:
{
  "message": "tu respuesta conversacional aquí",
  "hasEnoughInfo": true o false,
  "summary": "resumen de lo entendido (solo si hasEnoughInfo es true)"
}`

const RECOMMEND_SYSTEM_PROMPT = `Eres Pixel IA, un asesor de estrategia publicitaria para Meta Ads.

El usuario ya confirmó este resumen de su negocio. Ahora recomienda 3 ángulos de venta.

Considera: B2B/B2C, cliente objetivo, problema, contexto, modalidad comercial, objetivo de conversión, políticas Meta Ads.

Ángulos disponibles:
1. comparison — Contraste competitivo
2. problem-solution — Problema y solución
3. primary-benefit — Beneficio principal
4. social-proof — Prueba social
5. product-demo — Demostración del producto
6. usage-experience — Experiencia de uso
7. offer-convenience — Oferta y conveniencia
8. unique-mechanism — Mecanismo único

Estilos: white-bg, lifestyle, product-action, b2b, premium-editorial, benefits-infographic, direct-offer, minimal-tech
Formatos: square (1:1), story (9:16), 4:5 (4:5)
safeZoneMeta: solo true si formato es "story".

Reglas:
- 3 recomendaciones distintas.
- Solo IDs de las listas.
- Razones breves (máx 2 frases).
- Formatos variados.
- No inventar datos.

Responde ÚNICAMENTE con JSON.`

async function callKimi(messages: { role: string; content: string }[], useJson: boolean, apiKey: string, controller: AbortController) {
  const body: Record<string, unknown> = {
    model: "kimi-k2.6",
    messages,
    max_completion_tokens: 1200,
    temperature: 0.6,
    thinking: { type: "disabled" },
  }

  if (useJson) {
    body.response_format = { type: "json_object" }
  }

  return fetch("https://api.moonshot.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const action = body.action === "recommend" ? "recommend" : "chat"

  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    let messages: { role: string; content: string }[]
    let useJson: boolean

    if (action === "recommend") {
      const summary = typeof body.summary === "string" ? body.summary : ""
      if (!summary) {
        clearTimeout(timeout)
        return NextResponse.json({ error: "Falta el resumen del negocio" }, { status: 400, headers: { "Cache-Control": "no-store" } })
      }
      messages = [
        { role: "system", content: RECOMMEND_SYSTEM_PROMPT },
        { role: "user", content: `Basado en este resumen confirmado, recomienda 3 ángulos:\n\n${summary}` },
      ]
      useJson = true
    } else {
      const chatMessages = Array.isArray(body.messages) ? body.messages as Array<{ role: string; content: string }> : []
      if (chatMessages.length === 0) {
        clearTimeout(timeout)
        return NextResponse.json({ error: "La conversación está vacía" }, { status: 400, headers: { "Cache-Control": "no-store" } })
      }
      messages = [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        ...chatMessages.slice(-10),
      ]
      useJson = true
    }

    const kimiRes = await callKimi(messages, useJson, apiKey, controller)
    clearTimeout(timeout)

    if (!kimiRes.ok) {
      let providerCode: string | null = null
      let providerMessage: string | null = null
      try {
        const errBody = await kimiRes.json()
        providerCode = errBody?.error?.code ?? null
        providerMessage = errBody?.error?.message ?? null
      } catch { /* ignore */ }

      return NextResponse.json(
        { error: "Error al consultar el servicio de IA", providerStatus: kimiRes.status, providerCode, providerMessage },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      )
    }

    const kimiData = await kimiRes.json()
    const rawContent = kimiData.choices?.[0]?.message?.content

    if (!rawContent || typeof rawContent !== "string") {
      return NextResponse.json({ error: "Respuesta inválida del servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }

    if (action === "chat") {
      let parsed: Record<string, unknown> = { message: rawContent, hasEnoughInfo: false }
      try {
        const p = JSON.parse(rawContent)
        if (typeof p.message === "string") parsed = p
      } catch { /* usar texto crudo como message */ }

      const hasEnoughInfo = parsed.hasEnoughInfo === true
      const summary = hasEnoughInfo && typeof parsed.summary === "string" ? parsed.summary : undefined

      return NextResponse.json(
        { message: typeof parsed.message === "string" ? parsed.message : rawContent, hasEnoughInfo, summary: summary ?? null },
        { headers: { "Cache-Control": "no-store" } }
      )
    }

    // action === "recommend"
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(rawContent) } catch {
      return NextResponse.json({ error: "El servicio de IA devolvió un formato inesperado" }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }

    const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    if (recommendations.length < 3) {
      return NextResponse.json({ error: "El servicio de IA no generó suficientes recomendaciones" }, { status: 502, headers: { "Cache-Control": "no-store" } })
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
      { summary: typeof parsed.summary === "string" ? parsed.summary : "", recommendations: validated },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "El servicio de IA tardó demasiado. Intenta de nuevo." }, { status: 504, headers: { "Cache-Control": "no-store" } })
    }
    return NextResponse.json({ error: "Error al conectar con el servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }
}