"use client"

import Link from "next/link"
import { useEffect, useRef, type MouseEvent } from "react"
import { X } from "lucide-react"
import CreditPacks from "@/components/CreditPacks"
import PricingPlans from "@/components/PricingPlans"
import { usePlanChange } from "@/components/usePlanChange"
import styles from "@/components/PricingPlans.module.css"

// Packs are sold only to these subscriptions (the packs Checkout endpoint enforces the same list).
const PACK_STATUSES = ["active", "trialing"]

/* Native dialog: the top layer escapes the topbar's backdrop-filter, and focus
   handling and Escape come for free. A modal also keeps editor work in place.
   The content mounts only while open, so the subscription is read on demand. */
export default function CreditPacksDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="credit-packs-title" onClose={onClose} onClick={closeOnBackdrop}>
      <div className={styles.dialogBody}>
        <button type="button" className={styles.dialogClose} onClick={onClose} aria-label="Cerrar">
          <X aria-hidden="true" />
        </button>

        {open && <RechargeContent onClose={onClose} />}
      </div>
    </dialog>
  )
}

/*
 * A subscriber who can buy packs sees them first, as before. Everyone else
 * (no plan, a plan that is not in good standing, or a status we could not read)
 * sees the plans first and the packs below, explained as an add-on.
 */
function RechargeContent({ onClose }: { onClose: () => void }) {
  const { load, state } = usePlanChange()
  const status = state?.subscription?.status

  if (load === "loading") {
    return (
      <header className={styles.dialogHead}>
        <span className={styles.kicker}><i aria-hidden="true" />RECARGAR</span>
        <h2 id="credit-packs-title">Créditos</h2>
        <p role="status">Cargando tus opciones...</p>
      </header>
    )
  }

  if (load === "ready" && status && PACK_STATUSES.includes(status)) {
    return (
      <>
        <header className={styles.dialogHead}>
          <span className={styles.kicker}><i aria-hidden="true" />RECARGAR</span>
          <h2 id="credit-packs-title">Añade créditos a tu saldo</h2>
          <p>Sin cambiar de plan. Sirven igual para imágenes y videos.</p>
        </header>

        <CreditPacks />

        <Link className={styles.dialogLink} href="/dashboard/pricing" onClick={onClose}>Ver planes</Link>
      </>
    )
  }

  return (
    <>
      <header className={styles.dialogHead}>
        <span className={styles.kicker}><i aria-hidden="true" />PLANES</span>
        <h2 id="credit-packs-title">Elige un plan para tener créditos</h2>
        <p>Cada plan suma créditos todos los meses para imágenes y videos.</p>
      </header>

      <PricingPlans />

      <section className={styles.packsSection} aria-labelledby="recharge-packs-title">
        <header className={styles.packsHead}>
          <span className={styles.kicker}><i aria-hidden="true" />RECARGAR</span>
          <h2 id="recharge-packs-title">Packs de créditos adicionales</h2>
          <p>Disponibles con una suscripción activa: primero elige un plan y luego suma packs cuando los necesites.</p>
        </header>
        <CreditPacks locked />
      </section>
    </>
  )
}
