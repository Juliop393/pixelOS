"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, CalendarClock, RotateCw, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { CREDIT_PACKS, CREDIT_PACK_RULES, type CreditPack } from "@/lib/pricing-plans"
import styles from "./PackPurchaseCard.module.css"

/*
 * One confirmation card for credit pack purchases, TEST and LIVE alike. Checkout
 * returns to /dashboard, where it opens as a modal over the dashboard only when
 * the return carries a session_id. It trusts
 * nothing in the URL: the pack, its credits and the status come from
 * /api/stripe/packs/verify, which re-reads Stripe and the lot the webhook wrote.
 * "Credits added" is shown only for a lot confirmed as applied.
 */

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,240}$/
const AUTO_REFRESH_MS = 3000
const AUTO_REFRESH_TRIES = 3

type Status = "simulated" | "applied" | "pending"
type State =
  | { kind: "hidden" }
  | { kind: "checking" }
  | { kind: "verified"; pack: CreditPack; status: Status }
  | { kind: "unverified"; reason: "incomplete" | "unconfirmed" | "error" }

async function verify(sessionId: string): Promise<State> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { kind: "unverified", reason: "error" }

  const response = await fetch("/api/stripe/packs/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  })
  const body: unknown = await response.json().catch(() => null)
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>

  if (response.ok && data.verified === true) {
    // Credits come from the catalog for the pack the server verified, never from the response alone.
    const pack = CREDIT_PACKS.find((item) => item.id === data.pack)
    const status = data.status
    const modeOk = (data.mode === "live" && status !== "simulated") || (data.mode === "test" && status !== "applied")
    if (pack && pack.credits === data.credits && modeOk && (status === "simulated" || status === "applied" || status === "pending")) {
      return { kind: "verified", pack, status }
    }
    return { kind: "unverified", reason: "error" }
  }

  if (response.status === 409 && data.code === "incomplete") return { kind: "unverified", reason: "incomplete" }
  if (response.status === 400 || response.status === 404 || response.status === 409) return { kind: "unverified", reason: "unconfirmed" }
  return { kind: "unverified", reason: "error" }
}

interface Copy {
  eyebrow: string
  title: string
  text: string
  sub?: string
  note?: string
  amount?: string
  amountLabel?: string
  action?: "create" | "refresh" | "retry"
}

function copyFor(state: State): Copy | null {
  switch (state.kind) {
    case "hidden":
      return null
    case "checking":
      return { eyebrow: "VERIFICANDO", title: "Confirmando tu compra", text: "Consultamos a Stripe. Esto toma solo unos segundos." }
    case "unverified":
      if (state.reason === "incomplete") {
        return {
          eyebrow: "PAGO EN PROCESO",
          title: "Tu pago aún no está confirmado",
          text: "Stripe todavía no confirma este pago. Si acabas de pagar, espera unos segundos y vuelve a intentarlo.",
          action: "retry",
        }
      }
      return {
        eyebrow: "VERIFICACIÓN",
        title: "No pudimos confirmar esta compra",
        text: state.reason === "error"
          ? "Hubo un problema al consultar el pago. Esto no afecta a tu saldo; inténtalo nuevamente."
          : "No encontramos una compra confirmada para tu cuenta. Si acabas de pagar, vuelve a intentarlo en unos segundos.",
        action: "retry",
      }
    case "verified": {
      const { pack, status } = state
      if (status === "applied") {
        return {
          eyebrow: "RECARGA CONFIRMADA",
          title: "¡Gracias por tu compra!",
          text: `+${pack.credits} créditos añadidos a tu cuenta.`,
          sub: "Ya puedes utilizarlos para crear imágenes y videos.",
          amount: `+${pack.credits}`,
          amountLabel: "créditos",
          action: "create",
        }
      }
      if (status === "simulated") {
        return {
          eyebrow: "COMPRA DE PRUEBA",
          title: "¡Gracias por tu compra de prueba!",
          text: `Tu pack de ${pack.credits} créditos se registró correctamente.`,
          note: "Compra simulada. No se agregaron créditos reales.",
          amount: String(pack.credits),
          amountLabel: "créditos de prueba",
          action: "create",
        }
      }
      return {
        eyebrow: "PAGO CONFIRMADO",
        title: "¡Pago confirmado!",
        text: "Estamos preparando tu recarga.",
        sub: `Tu pack de ${pack.credits} créditos aparecerá en cuanto quede registrado.`,
        amount: String(pack.credits),
        amountLabel: "en preparación",
        action: "refresh",
      }
    }
  }
}

export default function PackPurchaseCard() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [state, setState] = useState<State>({ kind: "hidden" })
  const tries = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  const run = useCallback(async (id: string, manual: boolean) => {
    if (timer.current) clearTimeout(timer.current)
    if (manual) tries.current = 0
    setState({ kind: "checking" })
    let next: State
    try {
      next = await verify(id)
    } catch {
      next = { kind: "unverified", reason: "error" }
    }
    setState(next)
    // The webhook usually lands within seconds: re-check a few times, then leave it to the button.
    if (next.kind === "verified" && next.status === "pending" && tries.current < AUTO_REFRESH_TRIES) {
      tries.current += 1
      timer.current = setTimeout(() => void run(id, false), AUTO_REFRESH_MS)
    }
  }, [])

  useEffect(() => {
    // Only the pack Checkout return (/dashboard?pack_checkout=processing&session_id=...).
    // This card lives in the dashboard layout; other returns, such as the
    // subscription success page, carry a session_id that is not a pack.
    const params = new URLSearchParams(window.location.search)
    const id = params.get("session_id")
    if (window.location.pathname !== "/dashboard" || params.get("pack_checkout") !== "processing") return
    if (!id || !SESSION_ID.test(id)) return
    setSessionId(id)
    void run(id, true)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [run])

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setState({ kind: "hidden" })
    // Drop the return parameters so a reload does not show the card again; keep test mode.
    const url = new URL(window.location.href)
    url.searchParams.delete("session_id")
    url.searchParams.delete("pack_checkout")
    window.history.replaceState(window.history.state, "", url)
  }, [])

  const copy = copyFor(state)
  const visible = Boolean(copy && sessionId)

  // Native modal dialog: top layer above the dashboard, Escape and focus handling included.
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (visible && !element.open) element.showModal()
    if (!visible && element.open) element.close()
  }, [visible])

  if (!copy || !sessionId) return null
  const verified = state.kind === "verified"

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="pack-purchase-title"
      onClose={close}
      onClick={(event) => { if (event.target === event.currentTarget) close() }}
    >
    <section
      className={`${styles.card} ${verified ? "" : styles.neutral} ${copy.amount ? styles.withAmount : ""}`}
      aria-busy={state.kind === "checking"}
      aria-live="polite"
    >
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.sheen} aria-hidden="true" />
      <button type="button" className={styles.close} onClick={close} aria-label="Cerrar">
        <X aria-hidden="true" />
      </button>

      <div className={styles.logoWrap}>
        <span className={styles.logoRing} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src="/pixelfm-logo-mark.webp" width={64} height={64} alt="PixelFM" />
      </div>

      <div className={styles.body}>
        <span className={styles.eyebrow}><i aria-hidden="true" />{copy.eyebrow}</span>
        <h3 id="pack-purchase-title">{copy.title}</h3>
        <p className={styles.text}>{copy.text}</p>
        {copy.sub && <p className={styles.sub}>{copy.sub}</p>}

        {verified && (
          <p className={styles.validity}>
            <CalendarClock aria-hidden="true" />
            Vigencia de {CREDIT_PACK_RULES.validityMonths} meses
          </p>
        )}
        {copy.note && <p className={styles.note}>{copy.note}</p>}

        {state.kind === "checking" && (
          <p className={styles.checking} role="status"><span aria-hidden="true" />Verificando con Stripe…</p>
        )}

        <div className={styles.actions}>
          {copy.action === "create" && (
            <Link href="/dashboard/imagenes" className={styles.primary} onClick={close}>
              Empezar a crear
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
          {(copy.action === "refresh" || copy.action === "retry") && (
            <button type="button" className={styles.secondary} onClick={() => void run(sessionId, true)}>
              <RotateCw aria-hidden="true" />
              {copy.action === "refresh" ? "Actualizar estado" : "Reintentar"}
            </button>
          )}
        </div>
      </div>

      {copy.amount && (
        <div className={styles.amount}>
          <strong>{copy.amount}</strong>
          <span>{copy.amountLabel}</span>
        </div>
      )}
    </section>
    </dialog>
  )
}
