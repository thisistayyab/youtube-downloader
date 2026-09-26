import { NextResponse } from "next/server"

import { getPublicJob, getJob, removeJob } from "@/lib/job-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const job = getPublicJob(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json(job)
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params

  if (!getJob(jobId)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  removeJob(jobId)
  return NextResponse.json({ ok: true })
}
