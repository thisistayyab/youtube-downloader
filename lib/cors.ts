import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim()
  if (!raw) {
    return ["http://localhost:3000", "http://127.0.0.1:3000"]
  }
  return raw.split(",").map((o) => o.trim()).filter(Boolean)
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  const allowed = getAllowedOrigins()
  if (allowed.includes("*")) return true
  return allowed.some(
    (entry) => entry === origin || origin.startsWith(entry.replace(/\/$/, ""))
  )
}

export function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin")

  if (origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Vary", "Origin")
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  )
  response.headers.set(
    "Access-Control-Expose-Headers",
    "Content-Disposition, Content-Type, Content-Length"
  )

  return response
}

export function corsPreflightResponse(request: NextRequest): NextResponse | null {
  if (request.method !== "OPTIONS") return null

  const response = new NextResponse(null, { status: 204 })
  return withCors(request, response)
}
