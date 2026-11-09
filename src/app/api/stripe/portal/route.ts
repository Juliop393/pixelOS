import { NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { getRequestUser, getSiteUrl, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { getModeCustomer } from "@/lib/stripe-modes"
import { createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) return stripeJson({ error: "No autorizado" }, 401)

  try {
    if (!(await isWithinBillingLimit(user.id, "stripe-portal"))) {
      return stripeJson({ error: "Demasiados intentos. Espera un momento." }, 429)
    }

    // Only the customer of the active Stripe mode can open the Portal.
    const customer = await getModeCustomer(createAdminClient(), user.id)
    if (!customer) return stripeJson({ error: "No se encontró una cuenta de facturación" }, 404)

    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${getSiteUrl()}/dashboard/configuracion`,
    })

    return stripeJson({ url: session.url })
  } catch (error) {
    console.error("Stripe portal failed:", error instanceof Error ? error.message : "unexpected")
    return stripeJson({ error: "No se pudo abrir el portal de facturación" }, 502)
  }
}
