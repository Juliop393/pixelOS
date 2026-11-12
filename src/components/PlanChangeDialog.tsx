"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type MouseEvent } from "react"
import { X } from "lucide-react"
import { SUBSCRIPTION_PLANS, formatPrice, type PlanId } from "@/lib/pricing-plans"
import {
  formatPlanDate,
  planName,
  type PlanChangeState,
  type UpgradeQuote,
  type UpgradeResult,
} from "@/components/usePlanChange"
import styles from "@/components/PricingPlans.module.css"

/*
 * One dialog for plan changes, with the recharge dialog's native element and styles.
 *   downgrade: confirm, then show what the server actually scheduled.
 *   upgrade:   show Stripe's quote (amount, plan, credits, next renewal), charge on
 *              confirm, and welcome the user only once Stripe shows the new plan
 *              and its credits are recorded.
 */

export interface UpgradeApi {
  previewUpgrade: (plan: PlanId) => Promise<UpgradeQuote>
  upgrade: (plan: PlanId) => Promise<UpgradeResult>
  waitForUpgrade: (plan: PlanId) => Promise<boolean>
}

type UpgradeStep =
  | { step: "quote"; quote: UpgradeQuote | null; loadError: string | null }
  | { step: "applying" }
  | { step: "authenticate"; invoiceUrl: string }
  | { step: "welcome" }
  | { step: "slow" }
  | { step: "declined" }

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100)

export default function PlanChangeDialog({
  target,
  mode = "downgrade",
  state,
  busy,
  onConfirm,
  upgradeApi,
  onClose,
  settingsLink = true,
}: {
  target: PlanId | null
  mode?: "downgrade" | "upgrade"
  state: PlanChangeState | null
  busy: boolean
  onConfirm: (plan: PlanId) => Promise<PlanChangeState>
  upgradeApi?: UpgradeApi
  onClose: () => void
  settingsLink?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [done, setDone] = useState<PlanChangeState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [up, setUp] = useState<UpgradeStep>({ step: "quote", quote: null, loadError: null })
  const waiting = up.step === "applying"

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (target && !element.open) {
      setDone(null)
      setError(null)
      setUp({ step: "quote", quote: null, loadError: null })
      element.showModal()
      if (mode === "upgrade" && upgradeApi) {
        upgradeApi.previewUpgrade(target)
          .then((quote) => setUp({ step: "quote", quote, loadError: null }))
          .catch((failure) => setUp({ step: "quote", quote: null, loadError: failure instanceof Error ? failure.message : "No se pudo calcular el cambio." }))
      }
    }
    if (!target && element.open) element.close()
  }, [target, mode, upgradeApi])

  const locked = busy || waiting
  const close = () => { if (!locked) onClose() }
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close()
  }

  const subscription = state?.subscription
  const current = planName(subscription?.plan)
  const next = SUBSCRIPTION_PLANS.find((plan) => plan.id === target)
  const nextPrice = next && subscription
    ? `${formatPrice(subscription.interval === "annual" ? next.annualPrice : next.monthlyPrice)} USD / ${subscription.interval === "annual" ? "año" : "mes"}`
    : ""

  const confirm = async () => {
    if (!target) return
    setError(null)
    try {
      setDone(await onConfirm(target))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo completar el cambio de plan. Inténtalo nuevamente.")
    }
  }

  const waitForCredits = async () => {
    if (!target || !upgradeApi) return
    setUp({ step: "applying" })
    setUp({ step: (await upgradeApi.waitForUpgrade(target)) ? "welcome" : "slow" })
  }

  const confirmUpgrade = async () => {
    if (!target || !upgradeApi) return
    setError(null)
    try {
      const result = await upgradeApi.upgrade(target)
      if (result.result === "paid") await waitForCredits()
      else if (result.result === "requires_action") setUp({ step: "authenticate", invoiceUrl: result.invoiceUrl })
      else setUp({ step: "declined" })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo completar el cambio de plan. Inténtalo nuevamente.")
    }
  }

  const head = (kicker: string, title: string, text?: React.ReactNode) => (
    <header className={styles.dialogHead}>
      <span className={styles.kicker}><i aria-hidden="true" />{kicker}</span>
      <h2 id="plan-change-title">{title}</h2>
      {text && <p>{text}</p>}
    </header>
  )
  const primary = (label: string, onClick: () => void, disabled = false) => (
    <button type="button" className={`${styles.cta} ${styles.ctaFeatured}`} onClick={onClick} disabled={disabled} aria-busy={disabled}>{label}</button>
  )

  const upgradeBody = () => {
    const name = planName(target)
    switch (up.step) {
      case "welcome":
        return (
          <>
            {head("PLAN ACTIVO", `¡Bienvenido a ${name}!`, `Tu pago está confirmado y tus ${next?.monthlyCredits ?? ""} créditos de ${name} ya están disponibles.`)}
            <div className={styles.dialogActions}>{primary("Empezar a crear", onClose)}</div>
          </>
        )
      case "applying":
        return (
          <>
            {head("PAGO CONFIRMADO", "Aplicando tu nuevo plan…", "Stripe confirmó el pago. Estamos acreditando tus créditos; tarda unos segundos.")}
            <div className={styles.dialogActions}>{primary("Aplicando…", () => undefined, true)}</div>
          </>
        )
      case "slow":
        return (
          <>
            {head("PAGO CONFIRMADO", "Tus créditos están en camino", `El pago de ${name} está confirmado, pero los créditos todavía no aparecen. Se aplicarán automáticamente en unos minutos; no hace falta pagar de nuevo.`)}
            <div className={styles.dialogActions}>{primary("Entendido", onClose)}</div>
          </>
        )
      case "authenticate":
        return (
          <>
            {head("CONFIRMA EL PAGO", "Tu banco pide una confirmación", `Para mejorar a ${name}, confirma el pago en la página segura de Stripe. Hasta entonces conservas ${current} y no se aplica ningún cambio.`)}
            <div className={styles.dialogActions}>
              <a className={`${styles.cta} ${styles.ctaFeatured}`} href={up.invoiceUrl} target="_blank" rel="noopener noreferrer">Confirmar el pago en Stripe</a>
              <button type="button" className={styles.dialogLink} onClick={() => void waitForCredits()}>Ya lo confirmé</button>
            </div>
          </>
        )
      case "declined":
        return (
          <>
            {head("PAGO RECHAZADO", "No se pudo cobrar la mejora", `Tu banco rechazó el pago. No se cobró nada y sigues en ${current}. Actualiza tu tarjeta en «Gestionar suscripción» e inténtalo de nuevo.`)}
            <div className={styles.dialogActions}>{primary("Entendido", onClose)}</div>
          </>
        )
      default: {
        const quote = up.quote
        return (
          <>
            {head("MEJORA DE PLAN", `Mejorar a ${name}`, `Tu plan cambia hoy de ${current} a ${name} y empieza un nuevo período mensual.`)}
            {up.loadError ? (
              <p className={styles.dialogError} role="alert">{up.loadError}</p>
            ) : !quote ? (
              <p className={styles.dialogNote}>Calculando el importe con Stripe…</p>
            ) : (
              <ul className={styles.dialogFacts}>
                <li><strong>Hoy se cobra: {money(quote.amountDue, quote.currency)}</strong> (el precio completo de {name} para el nuevo período).</li>
                <li>Recibes {quote.credits} créditos nuevos de {name} al confirmarse el pago.</li>
                <li>{keptText(quote, current)}</li>
                <li>Próxima renovación: {formatPlanDate(quote.nextRenewal)}.</li>
                <li>Los créditos de packs no cambian.</li>
              </ul>
            )}
            {error && <p className={styles.dialogError} role="alert">{error}</p>}
            <div className={styles.dialogActions}>
              {primary(busy ? "Procesando el pago…" : quote ? `Pagar ${money(quote.amountDue, quote.currency)} y mejorar` : "Mejorar", () => void confirmUpgrade(), busy || !quote)}
              <button type="button" className={styles.dialogLink} onClick={close} disabled={busy}>Mantener {current}</button>
            </div>
          </>
        )
      }
    }
  }

  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${styles.dialogNarrow}`}
      aria-labelledby="plan-change-title"
      onCancel={(event) => { event.preventDefault(); close() }}
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      <div className={styles.dialogBody}>
        <button type="button" className={styles.dialogClose} onClick={close} disabled={locked} aria-label="Cerrar">
          <X aria-hidden="true" />
        </button>

        {mode === "upgrade" ? upgradeBody() : done?.pending?.plan ? (
          <>
            {head("CAMBIO PROGRAMADO", "Tu cambio de plan está programado",
              `Pasarás de ${planName(done.subscription?.plan)} a ${planName(done.pending.plan)} el ${formatPlanDate(done.pending.effectiveAt)}. Hasta entonces conservarás ${planName(done.subscription?.plan)}.`)}
            <p className={styles.dialogNote}>
              Puedes anular el cambio cuando quieras desde Configuración. Mientras esté programado, la cancelación desde el portal no está disponible.
            </p>
            <div className={styles.dialogActions}>
              {primary("Entendido", onClose)}
              {settingsLink && <Link className={styles.dialogLink} href="/dashboard/configuracion" onClick={onClose}>Ir a Configuración</Link>}
            </div>
          </>
        ) : (
          <>
            {head("CAMBIO DE PLAN", `Cambiar a ${planName(target)}`,
              `Pasarás de ${current} a ${planName(target)} el ${formatPlanDate(subscription?.periodEnd)}. Hasta entonces conservarás ${current}.`)}
            <ul className={styles.dialogFacts}>
              <li>No se cobra ni se devuelve nada ahora.</li>
              <li>Desde esa fecha pagarás {planName(target)}{nextPrice && ` (${nextPrice})`} y recibirás {next?.monthlyCredits ?? 0} créditos al mes.</li>
              <li>Mientras el cambio esté programado no podrás cancelar desde el portal. Puedes anularlo en cualquier momento.</li>
            </ul>
            {error && <p className={styles.dialogError} role="alert">{error}</p>}
            <div className={styles.dialogActions}>
              {primary(busy ? "Programando..." : `Confirmar cambio a ${planName(target)}`, () => void confirm(), busy)}
              <button type="button" className={styles.dialogLink} onClick={close} disabled={busy}>Mantener {current}</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}

/* The credits migration 016 keeps, only as the server read them from the engine. */
function keptText(quote: UpgradeQuote, current: string): string {
  const kept = quote.kept
  if (!kept) return "No pudimos confirmar tu saldo actual del período, así que aquí no mostramos créditos conservados."
  if (kept.credits === 0) return `No te quedan créditos de ${current} sin usar en este período.`
  return `Conservas tus ${kept.credits} créditos de ${current} sin usar. Vencen el ${formatPlanDate(kept.expiresAt)} y se usan primero.`
}
