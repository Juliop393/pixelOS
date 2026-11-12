"use client"

import { useEffect, useState } from "react"
import { CalendarClock } from "lucide-react"
import { toast } from "sonner"
import PlanChangeDialog from "@/components/PlanChangeDialog"
import { formatPlanDate, planName, usePlanChange } from "@/components/usePlanChange"
import type { PlanId } from "@/lib/pricing-plans"

/*
 * Scheduled downgrade in Settings: the user keeps the plan already paid until
 * the period ends, then the lower plan is billed. Everything shown comes from
 * the server's read of Stripe. While a change is scheduled Stripe blocks
 * cancelling from the Portal, so withdrawing it is always one click away here.
 */

const tile = "rounded-xl border border-[var(--pf-border)] bg-[var(--pf-panel)] p-4"
const label = "mb-1 text-xs uppercase tracking-[0.16em] text-[var(--pf-tertiary)]"
const secondaryButton = "rounded-xl border border-[var(--pf-border-hover)] bg-[var(--pf-panel)] px-4 py-3 text-sm font-semibold text-[var(--pf-primary)] transition-colors hover:border-[#D97757]/45 hover:text-white disabled:cursor-wait disabled:opacity-60"

export default function PlanChangePanel({ onPlan }: { onPlan?: (plan: PlanId) => void }) {
  const { state, load, busy, schedule, cancel, reload } = usePlanChange()
  const [target, setTarget] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The plan the user is billed for, as Stripe says, for the page's "Plan actual".
  const billedPlan = state?.subscription?.plan
  useEffect(() => { if (billedPlan) onPlan?.(billedPlan) }, [billedPlan, onPlan])

  if (load === "error") {
    return (
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[var(--pf-border)] bg-[var(--pf-panel)] p-4 text-sm text-[var(--pf-secondary)] sm:flex-row sm:items-center sm:justify-between" role="alert">
        <p>No pudimos cargar el estado de tu suscripción.</p>
        <button type="button" onClick={() => void reload()} className={secondaryButton}>Reintentar</button>
      </div>
    )
  }

  const subscription = state?.subscription
  if (load === "loading" || !subscription) return null

  const pending = state.pending
  const current = planName(subscription.plan)
  const intervalLabel = subscription.interval === "annual" ? "Anual" : "Mensual"

  const withdraw = async () => {
    setError(null)
    try {
      await cancel()
      toast.success("Se anuló el cambio programado. Conservarás tu plan actual.", { id: "plan-change" })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo anular el cambio. Inténtalo nuevamente.")
    }
  }

  return (
    <div className="mb-5 space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={tile}>
          <p className={label}>Facturación</p>
          <p className="text-base font-bold text-[var(--pf-headline)]">{intervalLabel}</p>
        </div>
        <div className={tile}>
          <p className={label}>{pending?.plan ? "Cambiará a" : subscription.cancelAtPeriodEnd ? "Estado" : "Al renovar"}</p>
          <p className="text-base font-bold text-[var(--pf-headline)]">
            {pending?.plan ? planName(pending.plan) : subscription.cancelAtPeriodEnd ? "Se cancela" : current}
          </p>
        </div>
        <div className={`${tile} col-span-2 sm:col-span-1`}>
          <p className={label}>{pending?.plan ? "Fecha efectiva" : subscription.cancelAtPeriodEnd ? "Último día" : "Renovación"}</p>
          <p className="text-base font-bold text-[var(--pf-headline)]">
            {formatPlanDate(pending?.plan ? pending.effectiveAt : subscription.periodEnd)}
          </p>
        </div>
      </div>

      {state.pendingPayment ? (
        <div className="rounded-xl border border-[#D97757]/35 bg-[#D97757]/10 p-4 text-sm" role="status">
          <p className="font-semibold text-[var(--pf-headline)]">
            Tu mejora a {planName(state.pendingPayment.plan)} está pendiente de pago. Hasta que se confirme sigues en {current} y no se aplica ningún cambio.
          </p>
          <p className="mt-1 text-[var(--pf-secondary)]">
            Si no la completas, se descarta sola{state.pendingPayment.expiresAt ? ` el ${formatPlanDate(state.pendingPayment.expiresAt)}` : ""} sin cobrarte nada.
          </p>
          {error && <p className="mt-3 text-[#F4B4A6]" role="alert">{error}</p>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {state.pendingPayment.invoiceUrl && (
              <a href={state.pendingPayment.invoiceUrl} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} text-center`}>Completar el pago</a>
            )}
            <button type="button" onClick={() => void withdraw()} disabled={Boolean(busy)} aria-busy={busy === "cancel"} className={secondaryButton}>
              {busy === "cancel" ? "Anulando..." : "Anular la mejora"}
            </button>
          </div>
        </div>
      ) : pending ? (
        <div className="rounded-xl border border-[#D97757]/35 bg-[#D97757]/10 p-4 text-sm" role="status">
          <div className="flex gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 flex-none text-[#E58A68]" strokeWidth={1.6} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--pf-headline)]">
                {pending.plan
                  ? `Tu plan cambiará a ${planName(pending.plan)} el ${formatPlanDate(pending.effectiveAt)}. Hasta entonces conservarás ${current}.`
                  : "Tu suscripción tiene un cambio programado."}
              </p>
              <p className="mt-1 text-[var(--pf-secondary)]">
                Mientras haya un cambio programado no puedes cancelar la suscripción desde el portal.
                Si lo anulas, conservas {current} y vuelves a poder cancelar desde «Gestionar suscripción».
              </p>
            </div>
          </div>
          {error && <p className="mt-3 text-[#F4B4A6]" role="alert">{error}</p>}
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={Boolean(busy)}
            aria-busy={busy === "cancel"}
            className={`${secondaryButton} mt-3 w-full sm:w-auto`}
          >
            {busy === "cancel" ? "Anulando..." : "Anular cambio programado"}
          </button>
        </div>
      ) : state.downgrades.length > 0 ? (
        <div className={`${tile} text-sm`}>
          <p className="font-semibold text-[var(--pf-headline)]">Bajar de plan</p>
          <p className="mt-1 text-[var(--pf-secondary)]">
            El cambio se aplica al terminar tu período actual, el {formatPlanDate(subscription.periodEnd)}. Hasta entonces conservas {current} y hoy no se cobra nada.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {state.downgrades.map((plan) => (
              <button key={plan} type="button" onClick={() => setTarget(plan)} disabled={Boolean(busy)} className={secondaryButton}>
                Cambiar a {planName(plan)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <PlanChangeDialog target={target} state={state} busy={busy === "schedule"} onConfirm={schedule} onClose={() => setTarget(null)} settingsLink={false} />
    </div>
  )
}
