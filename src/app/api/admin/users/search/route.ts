import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase-admin"

function getAdminEmails(): string[] {
  const raw = process.env.PIXELFM_ADMIN_EMAILS ?? ""
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

async function isAdmin(email: string): Promise<boolean> {
  const admins = getAdminEmails()
  return admins.includes(email.toLowerCase())
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Configuración del servidor incompleta" }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  if (!(await isAdmin(user.email))) {
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403, headers: { "Cache-Control": "no-store" } })
  }

  let body: { email?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const searchEmail = (body.email ?? "").trim().toLowerCase()
  if (!searchEmail || searchEmail.length > 255) {
    return NextResponse.json({ error: "Ingresa un correo válido" }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const adminClient = createAdminClient()
  let foundUserId: string | null = null
  let foundName = "Sin nombre"

  // Buscar por email usando listUsers con paginación
  let page = 0
  const perPage = 50

  while (true) {
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (listError || !listData?.users?.length) break

    for (const u of listData.users) {
      if (u.email?.toLowerCase() === searchEmail) {
        foundUserId = u.id
        foundName = u.user_metadata?.full_name || u.user_metadata?.name || "Sin nombre"
        break
      }
    }

    if (foundUserId) break
    if (listData.users.length < perPage) break
    page++
  }

  if (!foundUserId) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } })
  }

  // Buscar créditos
  const { data: credits } = await adminClient
    .from("user_credits")
    .select("*")
    .eq("user_id", foundUserId)
    .maybeSingle()

  return NextResponse.json(
    {
      user: {
        id: foundUserId,
        email: searchEmail,
        name: foundName,
        createdAt: (credits as Record<string, unknown> | null)?.created_at ?? null,
        credits: (credits as Record<string, unknown> | null)?.credits ?? 0,
        plan: (credits as Record<string, unknown> | null)?.plan ?? "Gratis",
        subscriptionStatus: (credits as Record<string, unknown> | null)?.subscription_status ?? "Sin suscripción",
        paddleCustomerId: (credits as Record<string, unknown> | null)?.paddle_customer_id ?? null,
        paddleSubscriptionId: (credits as Record<string, unknown> | null)?.paddle_subscription_id ?? null,
        creditsUpdatedAt: (credits as Record<string, unknown> | null)?.updated_at ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
