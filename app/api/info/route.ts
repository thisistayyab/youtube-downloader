import { NextResponse } from "next/server"

import { verifyRequestAuth } from "@/lib/auth"
import { checkRateLimit, getClientIp, getInfoRateLimit } from "@/lib/rate-limit"
import type { FetchInfoRequest } from "@/lib/ytdlp-types"
import { isValidYoutubeUrl } from "@/lib/ytdlp-utils"
import { fetchVideoInfo, YtdlpError } from "@/lib/ytdlp-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!verifyRequestAuth(request)) {
    return NextResponse.json(
      { error: "Access denied. Application is password protected." },
      { status: 401 }
    )
  }

  try {
    const limit = checkRateLimit(
      `info:${getClientIp(request)}`,
      getInfoRateLimit()
    )
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      )
    }

    const body = (await request.json()) as FetchInfoRequest
    const url = body.url?.trim()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!isValidYoutubeUrl(url)) {
      return NextResponse.json(
        { error: "Enter a valid YouTube video or playlist URL" },
        { status: 400 }
      )
    }

    const info = await fetchVideoInfo(url)
    return NextResponse.json(info)
  } catch (err) {
    if (err instanceof YtdlpError) {
      return NextResponse.json({ error: err.message }, { status: 503 })
    }
    return NextResponse.json(
      { error: "Failed to fetch video information" },
      { status: 500 }
    )
  }
}
