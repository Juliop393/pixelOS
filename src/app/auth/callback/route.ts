import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function preventCaching(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store")
  return response
}

function redirectToLoginWithError(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = "/login"
  redirectUrl.search = ""
  redirectUrl.searchParams.set("oauth_error", "callback")
  return preventCaching(NextResponse.redirect(redirectUrl))
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (!code) {
    return redirectToLoginWithError(request)
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = "/dashboard"
  redirectUrl.search = ""

  const response = preventCaching(NextResponse.redirect(redirectUrl))
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error(
      "Google OAuth callback failed:",
      error?.message ?? "Session missing after code exchange"
    )
    return redirectToLoginWithError(request)
  }

  return response
}
