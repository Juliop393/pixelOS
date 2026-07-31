import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdminEmails(): string[] {
  const raw = process.env.PIXELFM_ADMIN_EMAILS ?? ""
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ isAdmin: false }, { status: 500, headers: { "Cache-Control": "no-store" } })
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ isAdmin: false }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!user?.email) {
    return NextResponse.json({ isAdmin: false }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  const admins = getAdminEmails()
  return NextResponse.json(
    { isAdmin: admins.includes(user.email.toLowerCase()) },
    { headers: { "Cache-Control": "no-store" } }
  )
}