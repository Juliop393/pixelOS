import "server-only"

import { createAdminClient } from "@/lib/supabase-admin"

/*
 * Credit reservation of one video START, keyed by the request's idempotency key
 * (a UUID that video_start_requests accepts once per user). START reserves under
 * it; STATUS refunds it when fal reports a definitive failure. refund_credits_v2
 * is idempotent, so concurrent or repeated refunds return the credits once.
 */
export const videoReservationKey = (idempotencyKey: string) => `video:${idempotencyKey}`

export type VideoRefund =
  | { status: "refunded"; balance: number }
  | { status: "not_found" }
  | { status: "failed" }

export async function refundVideoReservation(userId: string, idempotencyKey: string): Promise<VideoRefund> {
  const reservationKey = videoReservationKey(idempotencyKey)
  try {
    const { data, error } = await createAdminClient().rpc("refund_credits_v2", {
      p_user_id: userId,
      p_reservation_key: reservationKey,
    })
    if (error) {
      // Reservations made before keys were derived from the request cannot be found by it.
      if (error.message === "reservation_not_found") return { status: "not_found" }
      console.error("Video STATUS refund_credits_v2 failed:", error.message, "key:", reservationKey, "user:", userId)
      return { status: "failed" }
    }
    const result = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null
    const balance = result?.balance
    if ((result?.status === "refunded" || result?.status === "already_refunded") &&
        typeof balance === "number" && Number.isInteger(balance) && balance >= 0) {
      return { status: "refunded", balance }
    }
    console.error("Video STATUS refund unexpected result:", result?.status ?? typeof data, "key:", reservationKey)
    return { status: "failed" }
  } catch (error) {
    console.error("Video STATUS refund exception:", error instanceof Error ? error.message : "unknown", "key:", reservationKey)
    return { status: "failed" }
  }
}
