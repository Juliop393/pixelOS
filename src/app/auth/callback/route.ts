import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

function redirectToLoginWithError(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = "/login"
  redirectUrl.search = ""
  redirectUrl.searchParams.set("oauth_error", "callback")
  return NextResponse.redirect(redirectUrl)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (!code) {
    return redirectToLoginWithError(request)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Google OAuth callback failed:", error.message)
    return redirectToLoginWithError(request)
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = "/dashboard"
  redirectUrl.search = ""
  return NextResponse.redirect(redirectUrl)
}
