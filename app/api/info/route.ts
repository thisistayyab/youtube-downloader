import { NextResponse } from "next/server"

import type { FetchInfoRequest } from "@/lib/ytdlp-types"
import { isValidYoutubeUrl } from "@/lib/ytdlp-utils"
import { assertSelfHostedRuntime } from "@/lib/runtime-environment"
import { fetchVideoInfo, YtdlpError } from "@/lib/ytdlp-runner"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    assertSelfHostedRuntime()
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
