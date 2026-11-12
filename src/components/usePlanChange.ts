"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { SUBSCRIPTION_PLANS, type BillingInterval, type PlanId } from "@/lib/pricing-plans"

/*
 * Client side of /api/stripe/plan-change: the user's plan and any scheduled
 * change, always as the server read them from Stripe. The browser only names
 * the plan wanted; success is reported only after the server confirms it.
 */

export interface PlanChangeState {
  subscription: { plan: PlanId; interval: BillingInterval; status: string; periodEnd: string | null; cancelAtPeriodEnd: boolean } | null
  pending: { plan: PlanId | null; effectiveAt: string | null; managed: boolean } | null
  downgrades: PlanId[]
  upgrades: PlanId[]
  pendingPayment: { plan: PlanId | null; invoiceUrl: string | null; expiresAt: string | null } | null
  creditsReady: boolean
}

export interface UpgradeQuote {
  plan: PlanId
  amountDue: number
  currency: string
  credits: number
  periodStart: string
  nextRenewal: string
  unused: { monthly: number; carried: number; lost: number; rolloverLost: number } | null
}

export type UpgradeResult =
  | { result: "paid"; state: PlanChangeState }
  | { result: "requires_action"; invoiceUrl: string; state: PlanChangeState }
  | { result: "declined"; state: PlanChangeState }

export type PlanChangeLoad = "loading" | "ready" | "error"

export const planName = (id: PlanId | null | undefined) =>
  SUBSCRIPTION_PLANS.find((plan) => plan.id === id)?.name ?? "otro plan"

export const formatPlanDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "tu próxima renovación"

export class PlanChangeRequestError extends Error {}

async function request<T = PlanChangeState>(method: "GET" | "POST" | "DELETE", body?: unknown, query = "", check = "downgrades"): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    if (method === "GET") return null
    throw new PlanChangeRequestError("Tu sesión expiró. Vuelve a iniciar sesión.")
  }
  let response: Response
  try {
    response = await fetch(`/api/stripe/plan-change${query}`, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new PlanChangeRequestError("No se pudo conectar con el servidor. Inténtalo nuevamente.")
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || typeof data !== "object" || !(check in data)) {
    throw new PlanChangeRequestError(
      typeof data?.error === "string" ? data.error : "No se pudo completar el cambio de plan. Inténtalo nuevamente."
    )
  }
  return data as T
}

const isStripeInvoiceUrl = (value: unknown) => {
  try { return typeof value === "string" && new URL(value).protocol === "https:" && new URL(value).hostname === "invoice.stripe.com" } catch { return false }
}

export function usePlanChange() {
  const [state, setState] = useState<PlanChangeState | null>(null)
  const [load, setLoad] = useState<PlanChangeLoad>("loading")
  const [busy, setBusy] = useState<"schedule" | "cancel" | "upgrade" | null>(null)
  const busyRef = useRef(false)

  const reload = useCallback(async () => {
    setLoad("loading")
    try {
      const next = await request("GET")
      setState(next)
      setLoad("ready")
      return next
    } catch {
      setLoad("error")
      return null
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  // Each action resolves with the server's new state, or throws its message. A ref guards double clicks.
  const run = useCallback(async (kind: "schedule" | "cancel" | "upgrade", method: "POST" | "DELETE", body?: unknown) => {
    if (busyRef.current) throw new PlanChangeRequestError("Ya hay una solicitud en curso.")
    busyRef.current = true
    setBusy(kind)
    try {
      const next = await request(method, body)
      setState(next)
      setLoad("ready")
      return next as PlanChangeState
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }, [])

  const schedule = useCallback((plan: PlanId) => run("schedule", "POST", { plan }), [run])
  const cancel = useCallback(() => run("cancel", "DELETE"), [run])

  const previewUpgrade = useCallback(async (plan: PlanId) =>
    (await request<UpgradeQuote>("GET", undefined, `?upgrade=${plan}`, "amountDue")) as UpgradeQuote, [])

  const upgrade = useCallback(async (plan: PlanId): Promise<UpgradeResult> => {
    if (busyRef.current) throw new PlanChangeRequestError("Ya hay una solicitud en curso.")
    busyRef.current = true
    setBusy("upgrade")
    try {
      const result = (await request<UpgradeResult>("POST", { plan, action: "upgrade" }, "", "result")) as UpgradeResult
      if (result.result === "requires_action" && !isStripeInvoiceUrl(result.invoiceUrl)) {
        throw new PlanChangeRequestError("No se pudo abrir la confirmación del pago. Inténtalo nuevamente.")
      }
      setState(result.state)
      return result
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }, [])

  /*
   * Waits until Stripe shows the new plan AND its credits are recorded (invoice.paid
   * went through the webhook). Resolves true only then; false after the time limit.
   */
  const waitForUpgrade = useCallback(async (plan: PlanId, timeoutMs = 60_000) => {
    const until = Date.now() + timeoutMs
    while (Date.now() < until) {
      try {
        const next = await request("GET")
        if (next) setState(next)
        if (next?.subscription?.plan === plan && next.creditsReady) return true
      } catch { /* keep waiting: a transient read error is not a result */ }
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }
    return false
  }, [])

  return { state, load, busy, schedule, cancel, reload, previewUpgrade, upgrade, waitForUpgrade }
}
