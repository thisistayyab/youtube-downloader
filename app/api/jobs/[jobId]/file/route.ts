import fs from "node:fs"

import { NextResponse } from "next/server"

import { isPathInside, resolveJobFile } from "@/lib/job-manifest"
import { getJob } from "@/lib/job-store"
import { buildContentDisposition } from "@/lib/ytdlp-utils"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const job = getJob(jobId)
  const resolved = resolveJobFile(jobId)

  if (!resolved) {
    const reason =
      job?.status === "error"
        ? job.error ?? "Download failed"
        : job && job.status !== "completed"
          ? "Download still in progress"
          : "File not found. The server may have restarted — download again."

    return NextResponse.json({ error: reason }, { status: 404 })
  }

  if (!isPathInside(resolved.filePath, resolved.jobDir)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
  }

  if (!fs.existsSync(resolved.filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(resolved.filePath)

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": buildContentDisposition(resolved.fileName),
      "Cache-Control": "no-store",
    },
  })
}
