/*
 * Commercial catalog of PixelFM: the single source for names, prices, credits,
 * features and packs. It is imported by client code, so it must stay free of
 * secrets and Price IDs: the Stripe mapping lives server-side in stripe-plans.ts.
 */

export const CREDIT_COST = { image: 1, video: 12 } as const

export const FREE_SIGNUP_CREDITS = 24

export const FREE_CREDITS_COPY = `${FREE_SIGNUP_CREDITS} créditos gratis · Sin tarjeta`

export const CREDIT_RATES = [
  `1 imagen = ${CREDIT_COST.image} crédito`,
  `1 video de 6 s = ${CREDIT_COST.video} créditos`,
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
