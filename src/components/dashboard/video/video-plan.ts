import { createVideoChunk, VIDEO_GENERATION_DURATION, type VideoChunk } from "./video-data"

export type SimpleDuration = "short" | "medium" | "long"

export const SIMPLE_DURATION_LABELS: Record<SimpleDuration, string> = {
  short: "Corto",
  medium: "Medio",
  long: "Largo",
}

export const SIMPLE_DURATION_RANGES: Record<SimpleDuration, string> = {
  short: "~6–10 s",
  medium: "~12–18 s",
  long: "~20–30 s",
}

export const SIMPLE_STYLE_LABELS: Record<string, string> = {
  cinematic: "Cinemático",
  ugc: "UGC",
  demo: "Demostración",
  commercial: "Oferta",
}

type PlanInput = {
  goal: string
  duration: SimpleDuration
  style: string
  referenceImageUrl: string
  referenceFileName: string
  firstId: number
}

type SceneIdea = { purpose: string; action: string }

/** Temporary local proposal. Replace this function's rules when a real planning service exists. */
export function proposeVideoPlan({ goal, duration, style, referenceImageUrl, referenceFileName, firstId }: PlanInput): VideoChunk[] {
  const cleanGoal = goal.trim().replace(/\s+/g, " ")
  const idea = (cleanGoal.length > 110 ? `${cleanGoal.slice(0, 107).trimEnd()}…` : cleanGoal).replace(/[.!?]+$/, "")
  const opening = style === "commercial"
    ? `Abrir con la propuesta de valor: ${idea}.`
    : style === "ugc"
      ? `Abrir con una reacción cercana que conecte con: ${idea}.`
      : style === "demo"
        ? `Abrir mostrando la referencia en acción para comunicar: ${idea}.`
        : `Revelar la referencia visual y presentar la idea: ${idea}.`
  const demonstration = style === "ugc"
    ? "Mostrar a una persona usando la referencia de forma natural y reconocible."
    : style === "commercial"
      ? "Mostrar en una acción concreta por qué esta propuesta resulta valiosa."
      : style === "cinematic"
        ? "Mostrar un detalle visual de la referencia y después verla en uso."
        : "Mostrar la referencia en uso mediante una acción clara y fácil de seguir."
  const benefit = style === "commercial"
    ? "Mostrar una evidencia visual o resultado que respalde el beneficio, sin inventar testimonios."
    : style === "ugc"
      ? "Mostrar el resultado de la experiencia desde el punto de vista de la persona."
      : "Mostrar el resultado o beneficio principal de la idea anunciada."
  const close = "Cerrar con la referencia visible y una invitación breve a dar el siguiente paso."

  const scenes: SceneIdea[] = duration === "short"
    ? [{ purpose: style === "demo" ? "Producto / demostración" : "Hook / apertura", action: `${opening} Mostrar una acción breve y cerrar con la referencia visible.` }]
    : duration === "medium"
      ? [
        { purpose: "Hook / apertura", action: opening },
        { purpose: style === "commercial" ? "CTA" : "Producto / demostración", action: `${demonstration} Terminar con una invitación breve.` },
      ]
      : [
        { purpose: "Hook / apertura", action: opening },
        { purpose: style === "commercial" ? "Beneficio" : "Producto / demostración", action: demonstration },
        { purpose: style === "commercial" ? "Prueba" : "Beneficio", action: benefit },
        { purpose: "CTA", action: close },
      ]

  return scenes.map(({ purpose, action }, index) => ({
    ...createVideoChunk(firstId + index, purpose),
    duration: VIDEO_GENERATION_DURATION,
    status: "configured",
    referenceSource: "upload",
    referenceImageUrl,
    referenceFileName,
    action,
  }))
}

export function getPlanSceneLabel(purpose: string): string {
  if (purpose === "Hook / apertura") return "Apertura"
  if (purpose === "Producto / demostración") return "Demostración"
  if (purpose === "CTA") return "Cierre"
  return purpose
}
