import { NextResponse } from "next/server"

import { startJob } from "@/lib/job-store"
import type { StartDownloadRequest, StartDownloadResponse } from "@/lib/ytdlp-types"
import { decodeYoutubeTitle, isValidYoutubeUrl } from "@/lib/ytdlp-utils"
import { assertSelfHostedRuntime } from "@/lib/runtime-environment"
import { ensureYtdlpAvailable, ensureFfmpegAvailable, YtdlpError, buildYtdlpArgs } from "@/lib/ytdlp-runner"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    assertSelfHostedRuntime()
    const body = (await request.json()) as StartDownloadRequest
    const url = body.url?.trim()

    if (!url || !isValidYoutubeUrl(url)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    if (!body.options?.format) {
      return NextResponse.json({ error: "Format is required" }, { status: 400 })
    }

    await ensureYtdlpAvailable()
    await ensureFfmpegAvailable()

    // Validate args before starting a background job.
    buildYtdlpArgs(url, body.options, process.cwd())

    const jobId = crypto.randomUUID()
    startJob({
      id: jobId,
      url,
      title: decodeYoutubeTitle(body.videoInfo?.title ?? "YouTube video"),
      thumbnail: body.videoInfo?.thumbnail,
      uploadDate: body.videoInfo?.upload_date,
      options: body.options,
    })

    const response: StartDownloadResponse = { jobId }
    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof YtdlpError) {
      const status = err.message.includes("not found") ? 503 : 400
      return NextResponse.json({ error: err.message }, { status })
    }
    return NextResponse.json({ error: "Failed to start download" }, { status: 500 })
  }
}
