"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { FREE_CREDITS_COPY } from "@/lib/pricing-plans"
import { useHasSession } from "./useHasSession"
import s from "./Landing.module.css"

/** Closing call to action: a signed-in visitor goes straight back to their studio. */
export default function SessionCta() {
  const signedIn = useHasSession()

  return <>
    <Link className={s.ctaPrimary} href={signedIn ? "/dashboard" : "/register"}>
      {signedIn ? "Ir al dashboard" : "Crear mi primer creativo"} <ArrowUpRight aria-hidden="true" />
    </Link>
    <small>{signedIn ? "Tu sesión está activa" : FREE_CREDITS_COPY}</small>
  </>
}
