import fs from "node:fs"
import { NextResponse } from "next/server"

import { getCookiesPath, getProxyUrl } from "@/lib/ytdlp-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Lightweight liveness probe and diagnostic check. */
export function GET() {
  const cookiePath = getCookiesPath()
  const cookiesLoaded = !!(cookiePath && fs.existsSync(cookiePath))
  let cookiesSize: number | undefined
  if (cookiesLoaded && cookiePath) {
    try {
      cookiesSize = fs.statSync(cookiePath).size
    } catch {
      // ignore
    }
  }

  const proxy = getProxyUrl()
  let sanitizedProxy: string | null = null
  if (proxy) {
    try {
      const u = new URL(proxy)
      sanitizedProxy = `${u.protocol}//${u.username ? "***:***@" : ""}${u.host}`
    } catch {
      sanitizedProxy = "configured"
    }
  }

  return NextResponse.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    cookies: {
      loaded: cookiesLoaded,
      path: cookiePath ?? null,
      sizeBytes: cookiesSize ?? 0,
    },
    proxy: {
      configured: !!proxy,
      target: sanitizedProxy,
    },
  })
}
