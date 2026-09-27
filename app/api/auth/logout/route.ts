import { NextResponse } from "next/server"

import { AUTH_COOKIE_NAME } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "Logged out and locked successfully",
  })

  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}
