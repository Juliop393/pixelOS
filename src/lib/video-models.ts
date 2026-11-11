import "server-only"

import { getVideoModel, type VideoModelId } from "@/lib/pricing-plans"

/*
 * Server-side mapping of the video tiers to fal.ai models. The browser only
 * names a tier ("rapid" | "premium"); credits, duration, resolution and the fal
 * endpoint always come from here. n8n receives the endpoint and must still
 * check it against its own allowlist before submitting.
 *
 * fal.ai docs (2026-11): both endpoints share one input schema
 * (prompt, image_url, duration, resolution 480P | 768P | 1080P, ...) and bill
 * per second of output: Turbo $0.04/s and H3 Max $0.08/s at 768P.
 */

export interface VideoModelConfig {
  tier: VideoModelId
  credits: number
  falModel: "minimax/h3-max-turbo/image-to-video" | "minimax/h3-max/image-to-video"
  duration: number
  resolution: "768P"
}

const FAL_MODELS: Record<VideoModelId, VideoModelConfig["falModel"]> = {
  rapid: "minimax/h3-max-turbo/image-to-video",
  premium: "minimax/h3-max/image-to-video",
}

export function getVideoModelConfig(tier: VideoModelId): VideoModelConfig {
  const model = getVideoModel(tier)
  return { tier, credits: model.credits, falModel: FAL_MODELS[tier], duration: model.durationSeconds, resolution: "768P" }
}
