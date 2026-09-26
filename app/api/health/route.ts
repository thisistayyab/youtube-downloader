import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Lightweight liveness probe for the hosting platform (Render health check). */
export function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
  })
}
