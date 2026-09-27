import crypto from "node:crypto"

export const AUTH_COOKIE_NAME = "app_access_token"

export function getAppSecret(): string | undefined {
  return process.env.APP_SECRET?.trim() || process.env.ADMIN_SECRET?.trim()
}

export function isAppLocked(): boolean {
  return !!getAppSecret()
}

/** Generates an HMAC SHA-256 token from the secret */
export function generateAuthToken(secret: string): string {
  return crypto
    .createHmac("sha256", "yt-downloader-salt-v1")
    .update(secret)
    .digest("hex")
}

export function isValidToken(token?: string | null): boolean {
  const secret = getAppSecret()
  if (!secret) return true // App is not locked
  if (!token) return false

  const expected = generateAuthToken(secret)
  return token === expected
}

export function verifyRequestAuth(request: Request): boolean {
  const secret = getAppSecret()
  if (!secret) return true // App is not locked

  // 1. Check custom authorization header
  const headerSecret = request.headers.get("x-app-secret")?.trim()
  if (headerSecret && headerSecret === secret) return true

  // 2. Check Bearer token in Authorization header
  const authHeader = request.headers.get("authorization")?.trim()
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim()
    if (bearer === secret || isValidToken(bearer)) return true
  }

  // 3. Check HTTP-only cookie
  const cookieHeader = request.headers.get("cookie") || ""
  const match = cookieHeader.match(
    new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`)
  )
  const token = match ? decodeURIComponent(match[1]) : null
  if (token && isValidToken(token)) return true

  // 4. Check query param (for direct downloads / download managers)
  try {
    const url = new URL(request.url)
    const querySecret = url.searchParams.get("secret")?.trim()
    if (querySecret && querySecret === secret) return true
    const queryToken = url.searchParams.get("token")?.trim()
    if (queryToken && isValidToken(queryToken)) return true
  } catch {
    // ignore URL parse errors
  }

  return isValidToken(token)
}

