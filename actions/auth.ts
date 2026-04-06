"use server"

import { cookies, headers } from "next/headers"

type AuthActionSuccess = {
  success: true
  data: unknown
}

type AuthActionFailure = {
  success: false
  message: string
}

export type AuthActionResult = AuthActionSuccess | AuthActionFailure

export type SignUpInput = {
  name: string
  email: string
  password: string
  image?: string
  callbackURL?: string
  rememberMe?: boolean
}

export type SignInInput = {
  email: string
  password: string
  callbackURL?: string
  rememberMe?: boolean
}

export async function signUpAction(
  input: SignUpInput
): Promise<AuthActionResult> {
  return callAuthEndpoint("/sign-up/email", input)
}

export async function signInAction(
  input: SignInInput
): Promise<AuthActionResult> {
  return callAuthEndpoint("/sign-in/email", input)
}

async function callAuthEndpoint(
  path: string,
  body: unknown
): Promise<AuthActionResult> {
  const requestHeaders = await headers()
  const cookieStore = await cookies()

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  if (!host) {
    return {
      success: false,
      message: "Unable to determine request host for authentication.",
    }
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https")

  const url = `${protocol}://${host}/api/auth${path}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieStore.toString(),
      origin: `${protocol}://${host}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  const setCookieHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : splitSetCookieHeader(response.headers.get("set-cookie") ?? "")

  for (const setCookieHeader of setCookieHeaders) {
    applySetCookieHeader(cookieStore, setCookieHeader)
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      success: false,
      message: getAuthErrorMessage(payload),
    }
  }

  return {
    success: true,
    data: payload,
  }
}

function getAuthErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Authentication failed."
  }

  const candidate = payload as {
    message?: string
    error?: { message?: string }
  }

  return (
    candidate.message ?? candidate.error?.message ?? "Authentication failed."
  )
}

function applySetCookieHeader(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  cookieString: string
) {
  const parts = cookieString.split(";").map((part) => part.trim())
  const [nameValue, ...attributes] = parts
  const separatorIndex = nameValue.indexOf("=")
  if (separatorIndex <= 0) {
    return
  }

  const name = nameValue.slice(0, separatorIndex)
  const value = nameValue.slice(separatorIndex + 1)

  const options: {
    path?: string
    domain?: string
    expires?: Date
    maxAge?: number
    secure?: boolean
    httpOnly?: boolean
    sameSite?: "lax" | "strict" | "none"
  } = {}

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split("=")
    const key = rawKey.toLowerCase()
    const rawValue = rawValueParts.join("=")

    if (key === "path") {
      options.path = rawValue || "/"
    } else if (key === "domain") {
      options.domain = rawValue
    } else if (key === "expires") {
      const expires = new Date(rawValue)
      if (!Number.isNaN(expires.getTime())) {
        options.expires = expires
      }
    } else if (key === "max-age") {
      const maxAge = Number.parseInt(rawValue, 10)
      if (!Number.isNaN(maxAge)) {
        options.maxAge = maxAge
      }
    } else if (key === "secure") {
      options.secure = true
    } else if (key === "httponly") {
      options.httpOnly = true
    } else if (key === "samesite") {
      const sameSite = rawValue.toLowerCase()
      if (
        sameSite === "lax" ||
        sameSite === "strict" ||
        sameSite === "none"
      ) {
        options.sameSite = sameSite
      }
    }
  }

  cookieStore.set(name, value, options)
}

function splitSetCookieHeader(header: string): string[] {
  if (!header) {
    return []
  }

  return header
    .split(/,(?=[^;]+=)/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}
