import { NextResponse } from "next/server"

import {
  checkRateLimit,
  getClientIp,
  getDownloadRateLimit,
} from "@/lib/rate-limit"
import { countActiveJobs, startJob } from "@/lib/job-store"
import type {
  StartDownloadRequest,
  StartDownloadResponse,
} from "@/lib/ytdlp-types"
import { decodeYoutubeTitle, isValidYoutubeUrl } from "@/lib/ytdlp-utils"
import {
  buildYtdlpArgs,
  ensureFfmpegAvailable,
  ensureYtdlpAvailable,
  getMaxConcurrentJobs,
  YtdlpError,
} from "@/lib/ytdlp-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 600

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(
      `download:${getClientIp(request)}`,
      getDownloadRateLimit()
    )
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: "Too many downloads. Please wait a minute and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      )
    }

    const body = (await request.json()) as StartDownloadRequest
    const url = body.url?.trim()

    if (!url || !isValidYoutubeUrl(url)) {
      return NextResponse.json(
        { error: "Enter a valid YouTube video or playlist URL" },
        { status: 400 }
      )
    }

    if (!body.options?.format) {
      return NextResponse.json(
        { error: "Choose a download format" },
        { status: 400 }
      )
    }

    const maxJobs = getMaxConcurrentJobs()
    if (countActiveJobs() >= maxJobs) {
      return NextResponse.json(
        {
          error:
            "The server is currently busy with other downloads. Please try again in a few moments.",
        },
        { status: 429, headers: { "Retry-After": "30" } }
      )
    }

    await Promise.all([ensureYtdlpAvailable(), ensureFfmpegAvailable()])

    // Pre-validate args before launching the background process
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
  } catch (error) {
    if (error instanceof YtdlpError) {
      const status = error.message.includes("not found") ? 503 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json(
      { error: "Could not start download job" },
      { status: 500 }
    )
  }
}
