"use client"

import Link from "next/link"
import { useEffect, useRef, type MouseEvent } from "react"
import { X } from "lucide-react"
import CreditPacks from "@/components/CreditPacks"
import styles from "@/components/PricingPlans.module.css"

/* Native dialog: the top layer escapes the topbar's backdrop-filter, and focus
   handling and Escape come for free. A modal also keeps editor work in place. */
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

        <header className={styles.dialogHead}>
          <span className={styles.kicker}><i aria-hidden="true" />RECARGAR</span>
          <h2 id="credit-packs-title">Añade créditos a tu saldo</h2>
          <p>Sin cambiar de plan. Sirven igual para imágenes y videos.</p>
        </header>

        <CreditPacks />

        <Link className={styles.dialogLink} href="/dashboard/pricing" onClick={onClose}>Ver planes</Link>
      </div>
    </dialog>
  )
}
