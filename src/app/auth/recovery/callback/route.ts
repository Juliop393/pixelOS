import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const INTERNAL_HOSTNAMES = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1"])

function parseOrigin(value: string | null | undefined, allowLocal = false) {
  if (!value) return null

  try {
    const url = new URL(value)
    const isLocal = INTERNAL_HOSTNAMES.has(url.hostname)

    if (url.username || url.password) return null
    if (url.protocol !== "https:" && !(allowLocal && isLocal && url.protocol === "http:")) {
      return null
    }
    if (isLocal && !allowLocal) return null

    return url.origin
  } catch {
    return null
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null
}

function getPublicOrigin(request: NextRequest) {
  const configuredOrigin = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  const requestOrigin = parseOrigin(
    request.nextUrl.origin,
    process.env.NODE_ENV !== "production"
  )

  if (configuredOrigin) {
    const configuredUrl = new URL(configuredOrigin)
    const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"))
    const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"))

    if (forwardedHost && forwardedProto) {
      const forwardedOrigin = parseOrigin(`${forwardedProto}://${forwardedHost}`)

      if (forwardedOrigin && new URL(forwardedOrigin).host === configuredUrl.host) {
        return forwardedOrigin
      }
    }

    return configuredOrigin
  }

  return requestOrigin
}

function createResetRedirect(request: NextRequest, hasError = false) {
  const publicOrigin = getPublicOrigin(request)
  const pathname = hasError
    ? "/reset-password?error=invalid_or_expired"
    : "/reset-password"
  const location = publicOrigin ? new URL(pathname, publicOrigin).toString() : pathname

  const response = new NextResponse(null, {
    status: 302,
    headers: { Location: location },
  })
  response.headers.set("Cache-Control", "private, no-store")

  return response
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (!code) {
    return createResetRedirect(request, true)
  }

  const response = createResetRedirect(request)
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
      "Password recovery callback failed:",
      error?.message ?? "Session missing after code exchange"
    )
    return createResetRedirect(request, true)
  }

  return response
}
