import { createReadStream, existsSync, statSync, unlinkSync } from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"

import { NextResponse } from "next/server"

import { isPathInside, resolveJobFile } from "@/lib/job-manifest"
import { getJob, markJobDelivered, removeJob } from "@/lib/job-store"
import { buildContentDisposition } from "@/lib/ytdlp-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".opus": "audio/ogg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".vtt": "text/vtt",
  ".srt": "text/plain; charset=utf-8",
  ".ass": "text/plain; charset=utf-8",
}

function contentTypeFor(fileName: string): string {
  return (
    MIME_TYPES[path.extname(fileName).toLowerCase()] ??
    "application/octet-stream"
  )
}

function notFoundReason(jobId: string): string {
  const job = getJob(jobId)

  if (job?.status === "error") return job.error ?? "Download failed"
  if (job && job.status !== "completed") return "Download still in progress"
  return "File not found. It may have been delivered and removed from the server already."
}

interface Range {
  start: number
  end: number
}

function parseRangeHeader(header: string, size: number): Range | "invalid" {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return "invalid"

  const [, startRaw, endRaw] = match
  if (!startRaw && !endRaw) return "invalid"

  let start: number
  let end: number

  if (!startRaw) {
    // Suffix range: last N bytes.
    const suffixLength = Number.parseInt(endRaw, 10)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return "invalid"
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number.parseInt(startRaw, 10)
    end = endRaw ? Number.parseInt(endRaw, 10) : size - 1
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid"
  if (start > end || start >= size) return "invalid"

  return { start, end: Math.min(end, size - 1) }
}

/** Checks shared by GET and HEAD. */
function resolveExistingFile(
  jobId: string
):
  | { ok: true; filePath: string; fileName: string; size: number }
  | { ok: false; response: NextResponse } {
  const resolved = resolveJobFile(jobId)

  if (!resolved) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: notFoundReason(jobId) },
        { status: 404 }
      ),
    }
  }

  if (!isPathInside(resolved.filePath, resolved.jobDir)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      ),
    }
  }

  if (!existsSync(resolved.filePath)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      ),
    }
  }

  return {
    ok: true,
    filePath: resolved.filePath,
    fileName: resolved.fileName,
    size: statSync(resolved.filePath).size,
  }
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const file = resolveExistingFile(jobId)
  if (!file.ok) return file.response

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Length": String(file.size),
      "Content-Disposition": buildContentDisposition(file.fileName),
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes",
    },
  })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const file = resolveExistingFile(jobId)
  if (!file.ok) return file.response

  const { filePath, fileName, size } = file

  const headers: Record<string, string> = {
    "Content-Type": contentTypeFor(fileName),
    "Content-Disposition": buildContentDisposition(fileName),
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
  }

  let start = 0
  let end = size - 1
  let status = 200

  const rangeHeader = request.headers.get("range")
  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, size)

    if (range === "invalid") {
      return new NextResponse(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      })
    }

    start = range.start
    end = range.end
    status = 206
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`
  }

  headers["Content-Length"] = String(end - start + 1)

  const stream = createReadStream(filePath, { start, end })

  // Delete files immediately after the stream finishes — server storage is a
  // pass-through buffer only. Aborted transfers fall back to the JOB_TTL_MS
  // sweep that evicts stale directories periodically.
  if (end >= size - 1) {
    stream.on("close", () => {
      try {
        unlinkSync(filePath)
      } catch {
        // ignore
      }
      try {
        removeJob(jobId)
      } catch {
        markJobDelivered(jobId)
      }
    })
  }

  stream.on("error", () => {
    try {
      markJobDelivered(jobId)
    } catch {
      // ignore
    }
  })

  const body = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>

  return new NextResponse(body, { status, headers })
}
