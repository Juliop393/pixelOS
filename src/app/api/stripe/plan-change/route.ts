import { NextRequest } from "next/server"
import { getRequestUser, isStripeCheckoutAllowed, isWithinBillingLimit, stripeJson } from "@/lib/stripe-api"
import { isStripePlan } from "@/lib/stripe-plans"
import {
  cancelPendingChange,
  getPlanChangeState,
  PlanChangeError,
  scheduleDowngrade,
} from "@/lib/stripe-plan-change"
import { previewUpgrade, upgradeSubscription } from "@/lib/stripe-plan-upgrade"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/*
 * GET     the user's plan and any pending change (read from Stripe).
 *         ?upgrade=<plan>: what upgrading would charge and grant (nothing changes).
 * POST    { plan }: schedule a downgrade to that lower plan at the end of the paid period.
 * POST    { plan, action: "upgrade" }: upgrade now; the higher plan applies only once paid.
 * DELETE  withdraw the pending change; always available, so a customer is never
 *         left unable to cancel (the Portal refuses while a change is scheduled).
 */

async function run(req: NextRequest, endpoint: string | null, action: (userId: string) => Promise<object>) {
  const user = await getRequestUser(req)
  if (!user) return stripeJson({ error: "No autorizado" }, 401)

  try {
    // Reads are not limited (the settings page loads them); changes are, and fail closed.
    if (endpoint && !(await isWithinBillingLimit(user.id, endpoint))) {
      return stripeJson({ error: "Demasiados intentos. Espera un momento." }, 429)
    }
    return stripeJson({ ...(await action(user.id)) })
  } catch (error) {
    if (error instanceof PlanChangeError) return stripeJson({ error: error.message, code: error.code }, error.status)
    console.error("Stripe plan change failed:", endpoint ?? "read", error instanceof Error ? error.message : "unexpected")
    return stripeJson({ error: "No se pudo completar el cambio de plan. Inténtalo nuevamente." }, 502)
  }
}

export async function GET(req: NextRequest) {
  const upgrade = req.nextUrl.searchParams.get("upgrade")
  if (upgrade === null) return run(req, null, getPlanChangeState)
  if (!isStripePlan(upgrade)) return stripeJson({ error: "Plan inválido" }, 400)
  return run(req, "stripe-plan-upgrade-preview", (userId) => {
    assertAllowed(userId)
    return previewUpgrade(userId, upgrade)
  })
}

// Same gate as Checkout: changes decide what is charged.
function assertAllowed(userId: string) {
  if (!isStripeCheckoutAllowed(userId)) {
    throw new PlanChangeError("not_allowed", 403, "El cambio de plan todavía no está disponible para esta cuenta")
  }
}

export async function POST(req: NextRequest) {
  let plan: unknown
  let kind: unknown
  try {
    const body = await req.json()
    plan = body?.plan
    kind = body?.action ?? "downgrade"
  } catch {
    return stripeJson({ error: "Cuerpo de solicitud inválido" }, 400)
  }
  if (!isStripePlan(plan) || (kind !== "downgrade" && kind !== "upgrade")) return stripeJson({ error: "Plan inválido" }, 400)

  if (kind === "upgrade") {
    return run(req, "stripe-plan-upgrade", async (userId) => {
      assertAllowed(userId)
      return upgradeSubscription(userId, plan)
    })
  }
  return run(req, "stripe-plan-change", async (userId) => {
    assertAllowed(userId)
    return scheduleDowngrade(userId, plan)
  })
}

export async function DELETE(req: NextRequest) {
  return run(req, "stripe-plan-change-cancel", cancelPendingChange)
}
