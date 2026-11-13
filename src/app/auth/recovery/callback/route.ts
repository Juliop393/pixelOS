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

// Opaque one-time values from Supabase: bounded charset and length, never logged or forwarded.
const SAFE_TOKEN = /^[A-Za-z0-9._-]{8,512}$/

/*
 * Two link shapes reach this route:
 * - token_hash + type=recovery (Reset Password template using {{ .TokenHash }}): verified on the
 *   server with verifyOtp, so the link works in any browser or device.
 * - code (template using {{ .ConfirmationURL }}, PKCE): needs the code verifier cookie left by the
 *   browser that requested the email; kept for links already sent.
 * Either way the session is written as cookies on the redirect to /reset-password, and any failure
 * goes to the same fixed internal error page. The query string is never copied to the redirect.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const tokenHash = params.get("token_hash")
  const type = params.get("type")
  const code = params.get("code")

  const useTokenHash = tokenHash !== null
  if (useTokenHash) {
    if (type !== "recovery" || !SAFE_TOKEN.test(tokenHash)) {
      console.error("Password recovery callback rejected: invalid token_hash link")
      return createResetRedirect(request, true)
    }
  } else if (!code || !SAFE_TOKEN.test(code)) {
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

  const { data, error } = useTokenHash
    ? await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!)

  if (error || !data.session) {
    // Only Supabase's error code/message: they never contain the token or the code.
    console.error(
      `Password recovery callback failed (${useTokenHash ? "token_hash" : "code"}):`,
      error?.code ?? error?.message ?? "Session missing after verification"
    )
    return createResetRedirect(request, true)
  }

  return response
}
