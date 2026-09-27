import { NextResponse } from "next/server"

import { isAppLocked, verifyRequestAuth } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: Request) {
  const locked = isAppLocked()
  const authenticated = verifyRequestAuth(request)

  return NextResponse.json({
    locked,
    authenticated: !locked || authenticated,
  })
}
