"use client"

import { toast } from "sonner"

/*
 * Opens the topbar's Recargar dialog from anywhere in the dashboard, without
 * leaving the page (editor work stays in place). The dialog itself decides what
 * to show: plans first without an active subscription, packs first with one.
 */
export const OPEN_RECHARGE_EVENT = "pixelfm:open-recharge"

export const openRecharge = () => window.dispatchEvent(new Event(OPEN_RECHARGE_EVENT))

/** The one "out of credits" notice, with a direct way to subscribe or top up. */
export function notifyNoCredits(detail?: string) {
  toast.error("Te quedaste sin créditos suficientes", {
    id: "no-credits",
    description: `${detail ? `${detail} ` : ""}Con un plan recibes créditos cada mes para imágenes y videos.`,
    action: { label: "Ver planes", onClick: openRecharge },
    duration: 10000,
  })
}
