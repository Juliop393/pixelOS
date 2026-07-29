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

const SYSTEM_PROMPT = `Eres Pixel IA, un asesor de estrategia publicitaria para Meta Ads.

Tu función es recomendar 3 ángulos de venta diferentes para un producto o servicio descrito por el usuario.

Considera:
- Si es B2B o B2C
- El cliente objetivo
- El problema principal que resuelve
- El contexto de uso
- La modalidad comercial (venta directa, por mayor, suscripción, etc.)
- El objetivo de conversión
- Las políticas de Meta Ads (no hacer afirmaciones falsas ni engañosas)

Ángulos disponibles:
1. comparison — Contraste competitivo: Compara alternativa genérica vs producto, sin mencionar marcas.
2. problem-solution — Problema y solución: Problema real del cliente y cómo el producto lo resuelve.
3. primary-benefit — Beneficio principal: Resultado práctico más importante del producto.
4. social-proof — Prueba social: Testimonios, reseñas o datos reales. No inventar datos.
5. product-demo — Demostración del producto: Producto funcionando en contexto real.
6. usage-experience — Experiencia de uso: Producto integrado en rutina del usuario.
7. offer-convenience — Oferta y conveniencia: Precio, stock, entrega, ahorro.
8. unique-mechanism — Mecanismo único: Tecnología o proceso que lo hace diferente.

Estilos visuales disponibles:
1. white-bg — Fondo de estudio
2. lifestyle — Lifestyle y contexto
3. product-action — Producto en acción
4. b2b — Comercial B2B
5. premium-editorial — Premium editorial
6. benefits-infographic — Infografía de beneficios
7. direct-offer — Oferta y venta directa
8. minimal-tech — Minimalista tecnológico

Formatos: square (1:1), story (9:16), 4:5 (4:5)

safeZoneMeta: solo true si formato es "story".

Reglas:
- Exactamente 3 recomendaciones distintas (no repetir ángulos).
- Solo usar IDs de las listas anteriores.
- Razones breves, contextualizadas al producto descrito.
- No inventar cifras, certificaciones ni clientes.
- Si falta contexto, hacer la mejor recomendación posible sin inventar.
- Recomendar formatos variados entre las 3 opciones.

Responde ÚNICAMENTE con un objeto JSON válido.`

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
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

  let body: { description?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const description = (body.description ?? "").trim()
  if (!description) {
    return NextResponse.json({ error: "Describe tu producto para recibir recomendaciones" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }
  if (description.length > 800) {
    return NextResponse.json({ error: "La descripción es demasiado larga" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    const kimiRes = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "kimi-k2.6",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1200,
        temperature: 0.6,
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!kimiRes.ok) {
      let providerCode: string | null = null
      let providerMessage: string | null = null
      try {
        const errBody = await kimiRes.json()
        providerCode = errBody?.error?.code ?? null
        providerMessage = errBody?.error?.message ?? null
      } catch { /* ignore parse errors */ }

      return NextResponse.json(
        {
          error: "Error al consultar el servicio de IA",
          providerStatus: kimiRes.status,
          providerCode,
          providerMessage,
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      )
    }

    const kimiData = await kimiRes.json()
    const rawContent = kimiData.choices?.[0]?.message?.content

    if (!rawContent || typeof rawContent !== "string") {
      return NextResponse.json({ error: "Respuesta inválida del servicio de IA" }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }

    // Parse y validar la respuesta
    let parsed: unknown
    try { parsed = JSON.parse(rawContent) } catch {
      return NextResponse.json({ error: "El servicio de IA devolvió un formato inesperado" }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }

    const data = parsed as Record<string, unknown>
    const recommendations = Array.isArray(data.recommendations) ? data.recommendations : []

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
      { summary: typeof data.summary === "string" ? data.summary : "Análisis del producto", recommendations: validated },
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