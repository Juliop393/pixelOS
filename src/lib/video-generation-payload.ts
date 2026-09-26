/** Optional Pro-mode metadata. Legacy callers only need imageUrl, angle, hook and style. */
export type VideoGenerationContext = {
  cta?: string
  format?: string
  sceneRole?: string
  referenceDescription?: string
  action?: string
  camera?: string
  dialogue?: string
  sceneStyle?: string
  duration?: number
}

const TEXT_LIMITS = {
  cta: 200,
  format: 20,
  sceneRole: 100,
  referenceDescription: 300,
  action: 500,
  camera: 350,
  dialogue: 500,
  sceneStyle: 350,
} as const

/** Explicit allowlist: omit empty/invalid optional values and never forward arbitrary fields. */
export function getVideoGenerationContext(input: VideoGenerationContext | Record<string, unknown>): VideoGenerationContext {
  const context: VideoGenerationContext = {}
  for (const field of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    const value = input[field]
    if (typeof value !== "string") continue
    const text = value.trim().slice(0, TEXT_LIMITS[field])
    if (text) context[field] = text
  }
  if (typeof input.duration === "number" && Number.isFinite(input.duration) && input.duration > 0) {
    context.duration = input.duration
  }
  return context
}
