import { NextResponse } from "next/server"

import { verifyRequestAuth } from "@/lib/auth"
import { getPublicJob, getJob, removeJob } from "@/lib/job-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  if (!verifyRequestAuth(request)) {
    return NextResponse.json(
      { error: "Access denied. Application is password protected." },
      { status: 401 }
    )
  }

  const { jobId } = await context.params
  const job = getPublicJob(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json(job)
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  if (!verifyRequestAuth(request)) {
    return NextResponse.json(
      { error: "Access denied. Application is password protected." },
      { status: 401 }
    )
  }

  const { jobId } = await context.params

  if (!getJob(jobId)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  removeJob(jobId)
  return NextResponse.json({ ok: true })
}
