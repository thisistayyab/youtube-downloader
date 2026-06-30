import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { corsPreflightResponse, withCors } from "@/lib/cors"

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const preflight = corsPreflightResponse(request)
  if (preflight) return preflight

  return withCors(request, NextResponse.next())
}

export const config = {
  matcher: "/api/:path*",
}
