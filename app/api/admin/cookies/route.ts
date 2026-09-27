import fs from "node:fs"
import { NextResponse } from "next/server"

import {
  ensureDownloadRoot,
  getCookiesPath,
  getRuntimeCookiesPath,
} from "@/lib/ytdlp-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAuthorized(requestSecret?: string): boolean {
  const configured = process.env.ADMIN_SECRET?.trim()
  if (!configured) return true // No password configured: open for quick personal setups
  return requestSecret?.trim() === configured
}

export function GET() {
  const runtimePath = getRuntimeCookiesPath()
  const activePath = getCookiesPath()
  const requiresSecret = !!process.env.ADMIN_SECRET?.trim()

  let source: "runtime" | "secret_file" | "env" | "local" | "none" = "none"
  let sizeBytes = 0
  let lineCount = 0

  if (activePath && fs.existsSync(activePath)) {
    try {
      const stats = fs.statSync(activePath)
      sizeBytes = stats.size

      if (activePath === runtimePath) {
        source = "runtime"
      } else if (activePath === "/etc/secrets/cookies.txt") {
        source = "secret_file"
      } else if (activePath.includes("cookies.txt")) {
        source = "local"
      } else {
        source = "env"
      }

      const content = fs.readFileSync(activePath, "utf8")
      lineCount = content.split("\n").filter((l) => l.trim().length > 0).length
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    loaded: source !== "none",
    source,
    path: activePath ?? null,
    sizeBytes,
    lineCount,
    requiresSecret,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      secret?: string
      cookiesContent?: string
    }

    if (!isAuthorized(body.secret)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      )
    }

    const content = body.cookiesContent?.trim()
    if (!content) {
      return NextResponse.json(
        { error: "Cookie content cannot be empty" },
        { status: 400 }
      )
    }

    if (content.length < 20) {
      return NextResponse.json(
        { error: "Invalid cookie content: string is too short" },
        { status: 400 }
      )
    }

    ensureDownloadRoot()
    const targetPath = getRuntimeCookiesPath()

    fs.writeFileSync(targetPath, content, "utf8")
    const stat = fs.statSync(targetPath)
    const lineCount = content
      .split("\n")
      .filter((l) => l.trim().length > 0).length

    return NextResponse.json({
      ok: true,
      message: "Cookies saved successfully to server runtime memory.",
      path: targetPath,
      sizeBytes: stat.size,
      lineCount,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save cookies"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      secret?: string
    }

    if (!isAuthorized(body.secret)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      )
    }

    const targetPath = getRuntimeCookiesPath()
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath)
    }

    return NextResponse.json({
      ok: true,
      message: "Runtime cookies cleared successfully.",
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove cookies"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
