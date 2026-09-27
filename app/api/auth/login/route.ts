import { NextResponse } from "next/server"

import {
  AUTH_COOKIE_NAME,
  generateAuthToken,
  getAppSecret,
  isAppLocked,
} from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string
    }

    if (!isAppLocked()) {
      return NextResponse.json({ ok: true, message: "App is not locked" })
    }

    const secret = getAppSecret()
    const password = body.password?.trim()

    if (!password || password !== secret) {
      return NextResponse.json(
        { error: "Incorrect secret password" },
        { status: 401 }
      )
    }

    const token = generateAuthToken(secret)
    const response = NextResponse.json({
      ok: true,
      message: "Unlocked successfully",
    })

    // Set cookie for 30 days
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
