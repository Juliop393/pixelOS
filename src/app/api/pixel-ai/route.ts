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

  let body: { action?: string; messages?: Array<{ role: string; content: string }>; collectedContext?: Record<string, unknown> }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const action = body.action === "recommend" ? "recommend" : "chat"

  if (action === "chat") {
    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : []
    if (messages.length === 0) {
      return NextResponse.json({ error: "Envía al menos un mensaje" }, { status: 400, headers: { "Cache-Control": "no-store" } })
    }

    const apiMessages = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user" as const,
        content: m.content,
      })),
    ]

    const result = await callKimi(apiMessages, true)

    if (!result) {
      return NextResponse.json({ error: "Error al conectar con el servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }

    if (!result.ok) {
      const errBody = result.data as Record<string, unknown>
      return NextResponse.json(
        {
          error: "Error al consultar el servicio de IA",
          providerStatus: result.status,
          providerCode: (errBody?.error as Record<string, unknown>)?.code ?? null,
          providerMessage: (errBody?.error as Record<string, unknown>)?.message ?? null,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      )
    }

    const rawContent = (result.data as any)?.choices?.[0]?.message?.content as string | undefined
    if (typeof rawContent !== "string") {
      return NextResponse.json({ error: "Respuesta inválida del servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }

    try {
      const parsed = JSON.parse(rawContent) as Record<string, unknown>
      return NextResponse.json(
        {
          type: parsed.readyToConfirm ? "confirmation" : "question",
          message: typeof parsed.message === "string" ? parsed.message : "¿En qué más puedo ayudarte?",
          collectedContext: parsed.collectedContext ?? {},
        },
        { headers: { "Cache-Control": "no-store" } }
      )
    } catch {
      return NextResponse.json(
        { type: "question", message: rawContent, collectedContext: {} },
        { headers: { "Cache-Control": "no-store" } }
      )
    }
  }

  // action === "recommend"
  const context = body.collectedContext ?? {}
  const product = typeof context.product === "string" ? context.product : ""
  const audience = typeof context.audience === "string" ? context.audience : ""
  const goal = typeof context.goal === "string" ? context.goal : ""

  if (!product || !audience || !goal) {
    return NextResponse.json({ error: "Falta información del producto, público u objetivo" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const description = `Producto: ${product}\nPúblico: ${audience}\nObjetivo: ${goal}`

  const apiMessages = [
    { role: "system", content: RECOMMEND_SYSTEM_PROMPT },
    { role: "user", content: description },
  ]

  const result = await callKimi(apiMessages, true)

  if (!result) {
    return NextResponse.json({ error: "Error al conectar con el servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }

  if (!result.ok) {
    const errBody = result.data as Record<string, unknown>
    return NextResponse.json(
      {
        error: "Error al consultar el servicio de IA",
        providerStatus: result.status,
        providerCode: (errBody?.error as Record<string, unknown>)?.code ?? null,
        providerMessage: (errBody?.error as Record<string, unknown>)?.message ?? null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }

  const rawContent = (result.data as any)?.choices?.[0]?.message?.content as string | undefined
  if (typeof rawContent !== "string") {
    return NextResponse.json({ error: "Respuesta inválida del servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
  }

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
    {
      type: "recommendations",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      productDescription: typeof parsed.productDescription === "string" ? parsed.productDescription.slice(0, 180) : "",
      recommendations: validated,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}