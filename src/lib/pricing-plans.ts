/*
 * Commercial catalog of PixelFM: the single source for names, prices, credits,
 * features and packs. It is imported by client code, so it must stay free of
 * secrets and Price IDs: the Stripe mapping lives server-side in stripe-plans.ts.
 */

/*
 * Video tiers. The browser only names a tier; the server charges these credits
 * and picks the model from this table (see src/lib/video-models.ts).
 */
export type VideoModelId = "rapid" | "premium"

export interface VideoModel {
  id: VideoModelId
  label: string
  detail: string
  credits: number
  durationSeconds: number
}

export const VIDEO_MODELS: VideoModel[] = [
  { id: "rapid", label: "Video Rápido", detail: "Listo antes, ideal para probar ideas", credits: 10, durationSeconds: 10 },
  { id: "premium", label: "Video Premium", detail: "Máximo detalle y movimiento", credits: 20, durationSeconds: 10 },
]

export const DEFAULT_VIDEO_MODEL: VideoModelId = "rapid"

export const isVideoModelId = (value: unknown): value is VideoModelId => VIDEO_MODELS.some((model) => model.id === value)

export const getVideoModel = (id: VideoModelId): VideoModel => VIDEO_MODELS.find((model) => model.id === id)!

const RAPID_VIDEO = getVideoModel("rapid")
const PREMIUM_VIDEO = getVideoModel("premium")

/** video: the cheapest tier, used for "up to N videos" outcomes. */
export const CREDIT_COST = { image: 1, video: RAPID_VIDEO.credits, premiumVideo: PREMIUM_VIDEO.credits } as const

export const VIDEO_DURATION_SECONDS = RAPID_VIDEO.durationSeconds

export const FREE_SIGNUP_CREDITS = 24

export const FREE_CREDITS_COPY = `${FREE_SIGNUP_CREDITS} créditos gratis · Sin tarjeta`

export const CREDIT_RATES = [
  `1 imagen = ${CREDIT_COST.image} crédito`,
  `1 video rápido de ${RAPID_VIDEO.durationSeconds} s = ${RAPID_VIDEO.credits} créditos`,
  `1 video premium de ${PREMIUM_VIDEO.durationSeconds} s = ${PREMIUM_VIDEO.credits} créditos`,
]

export const videosFor = (credits: number) => Math.floor(credits / CREDIT_COST.video)

export const formatPrice = (amount: number) => `$${amount}`

export type PlanId = "starter" | "growth" | "pro"

export interface SubscriptionPlan {
  id: PlanId
  name: string
  monthlyPrice: number
  /** Billed once a year; the credits are still delivered month by month. */
  annualPrice: number
  monthlyCredits: number
  audience: string
  recommended: boolean
  /** Short argument shown under the price. */
  note?: string
  /** One-line reminder of how the plan treats unused credits. */
  creditRule?: string
  /** Kit = 1 video + 4 images. */
  adKits?: number
  concurrentGenerations: number
  seats: number
  rollover: boolean
  priorityQueue: boolean
  /** Full list for the pricing pages. */
  features: string[]
  /** Compact list for the landing, shown after credits and outcome. */
  highlights: string[]
  landingCta: string
}

const EXTRA_CREDITS = "Compra créditos extra cuando quieras"
const ROLLOVER = "Los créditos no usados pasan al siguiente mes"
const ROLLOVER_CAP = "Acumulación máxima: una asignación mensual adicional"

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 19,
    annualPrice: 190,
    monthlyCredits: 120,
    audience: "Para emprendedores y pequeñas tiendas que producen anuncios algunas veces al mes.",
    recommended: false,
    creditRule: "Los créditos mensuales vencen al renovar.",
    concurrentGenerations: 2,
    seats: 1,
    rollover: false,
    priorityQueue: false,
    features: [
      "Modo Simple y Modo Pro",
      "PixelIA",
      "Imagen + Video",
      "Formatos 1:1, 4:5 y 9:16",
      "Uso comercial",
      "Sin marca de agua",
      "Hasta 2 generaciones simultáneas",
      "1 usuario",
      EXTRA_CREDITS,
    ],
    highlights: ["Modo Simple, Modo Pro y PixelIA", "Uso comercial, sin marca de agua", "Hasta 2 generaciones simultáneas"],
    landingCta: "Empezar con Starter",
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 39,
    annualPrice: 390,
    monthlyCredits: 300,
    audience: "Para pymes y marketers que prueban anuncios cada semana.",
    recommended: true,
    note: "2.5× más créditos que Starter por ~2× el precio.",
    adKits: 18,
    concurrentGenerations: 4,
    seats: 2,
    rollover: true,
    priorityQueue: false,
    features: [
      "Todo lo incluido en Starter",
      "Hasta 4 generaciones simultáneas",
      "Hasta 2 usuarios",
      ROLLOVER,
      ROLLOVER_CAP,
      EXTRA_CREDITS,
    ],
    highlights: ["Todo lo incluido en Starter", "Hasta 4 generaciones y 2 usuarios", ROLLOVER],
    landingCta: "Elegir Growth",
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 89,
    annualPrice: 890,
    monthlyCredits: 720,
    audience: "Para media buyers, agencias pequeñas y equipos de mayor volumen.",
    recommended: false,
    adKits: 45,
    concurrentGenerations: 8,
    seats: 5,
    rollover: true,
    priorityQueue: true,
    features: [
      "Todo lo incluido en Growth",
      "Hasta 8 generaciones simultáneas",
      "Hasta 5 usuarios",
      ROLLOVER,
      ROLLOVER_CAP,
      "Cola prioritaria",
      EXTRA_CREDITS,
    ],
    highlights: ["Todo lo incluido en Growth", "Hasta 8 generaciones y 5 usuarios", "Cola prioritaria"],
    landingCta: "Elegir Pro",
  },
]

export type BillingInterval = "monthly" | "annual"

export const isBillingInterval = (value: unknown): value is BillingInterval => value === "monthly" || value === "annual"

/*
 * What can be bought. A plan and interval are ready only when the Stripe
 * webhook grants its credits (migration 014: all three plans, monthly and
 * annual). The Checkout endpoint enforces this same table, so the buttons and
 * the server never disagree; the server also needs the Price ID, and for
 * annual plans the monthly delivery job (see stripe-plans.ts).
 */
const CHECKOUT_READY: Record<PlanId, Record<BillingInterval, boolean>> = {
  starter: { monthly: true, annual: true },
  growth: { monthly: true, annual: true },
  pro: { monthly: true, annual: true },
}

export const isPlanCheckoutReady = (plan: PlanId, interval: BillingInterval) => CHECKOUT_READY[plan][interval]

export const planOutcome = (plan: SubscriptionPlan) =>
  `Hasta ${videosFor(plan.monthlyCredits)} videos o ${plan.monthlyCredits} imágenes al mes.`

export type CreditPackId = "small" | "medium" | "large"

export interface CreditPack {
  id: CreditPackId
  credits: number
  price: number
  tagline: string
  emphasized: boolean
}

export const CREDIT_PACK_RULES = {
  subscribersOnly: true,
  validityMonths: 12,
  stackable: true,
  survivesCancellation: true,
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "small", credits: 60, price: 12, tagline: "Para un impulso puntual", emphasized: false },
  { id: "medium", credits: 180, price: 29, tagline: "Para una campaña", emphasized: true },
  { id: "large", credits: 480, price: 69, tagline: "Para periodos de mayor producción", emphasized: false },
]
