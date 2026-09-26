import path from "node:path"

import type {
  DownloadOptions,
  DownloadProgressEvent,
  DownloadStatus,
} from "./ytdlp-types"
import {
  applyUploadDateToFile,
  createJobDirectory,
  deleteJobDirectory,
  getDeliveredJobTtlMs,
  getJobTtlMs,
  getProcessingTimeoutMs,
  parseYtdlpOutputLine,
  renameToYoutubeTitle,
  resolveJobOutputFile,
  sanitizeYtdlpMessage,
  spawnDownload,
  sweepStaleJobDirectories,
} from "./ytdlp-runner"
import { isJobFileReady, writeJobManifest } from "./job-manifest"

interface StoredJob {
  id: string
  url: string
  title: string
  thumbnail?: string
  status: DownloadStatus
  progress: number
  speed?: string
  eta?: string
  filePath?: string
  fileName?: string
  error?: string
  options: DownloadOptions
  uploadDate?: string
  createdAt: number
  expiresAt: number
  jobDir: string
  stderr: string
  processingPhase?: string
  lastActivityAt: number
  deliveredAt?: number
  process?: { kill: () => void }
  watchdog?: ReturnType<typeof setInterval>
  cleanupTimer?: ReturnType<typeof setTimeout>
}

const jobs = new Map<string, StoredJob>()

function toPublicJob(job: StoredJob): DownloadProgressEvent & {
  title: string
  thumbnail?: string
  createdAt: number
  fileReady: boolean
} {
  return {
    jobId: job.id,
    title: job.title,
    thumbnail: job.thumbnail,
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    filePath: job.fileName,
    error: job.error,
    createdAt: job.createdAt,
    fileReady:
      job.status === "completed" && isJobFileReady(job.id, job.filePath),
    processingPhase: job.processingPhase,
  }
}

function finishJobSuccess(job: StoredJob, rawFilePath: string): void {
  let filePath = rawFilePath
  try {
    filePath = renameToYoutubeTitle(rawFilePath, job.title)
  } catch {
    // Keep id-based filename if title rename fails (permissions, path length, etc.)
  }
  job.filePath = filePath
  job.fileName = path.basename(filePath)

  if (job.options.preserveUploadDate) {
    applyUploadDateToFile(filePath, job.uploadDate)
  }

  writeJobManifest(job.jobDir, {
    jobId: job.id,
    title: job.title,
    fileName: job.fileName,
    filePath,
    completedAt: Date.now(),
  })

  job.status = "completed"
  job.progress = 100
  job.processingPhase = undefined
  job.speed = undefined
  job.eta = undefined
  job.error = undefined
}

function clearWatchdog(job: StoredJob): void {
  if (job.watchdog) {
    clearInterval(job.watchdog)
    job.watchdog = undefined
  }
}

function completeOrFail(jobId: string, exitCode: number | null): void {
  const job = jobs.get(jobId)
  if (!job) return

  clearWatchdog(job)
  job.process = undefined

  if (exitCode !== 0) {
    job.processingPhase = "Finishing merge…"
  }

  const filePath = resolveJobOutputFile(
    job.jobDir,
    job.filePath,
    job.options.mergeOutputFormat
  )

  if (filePath) {
    finishJobSuccess(job, filePath)
    return
  }

  job.status = "error"
  job.processingPhase = undefined
  job.error =
    sanitizeYtdlpMessage(job.stderr) ||
    (exitCode === null
      ? "Download timed out during merge. Try 1080p MP4 preset instead of 4K."
      : "Download failed")
}

export function getJob(jobId: string): StoredJob | undefined {
  return jobs.get(jobId)
}

export function getPublicJob(jobId: string) {
  const job = jobs.get(jobId)
  return job ? toPublicJob(job) : undefined
}

export function removeJob(jobId: string): void {
  const job = jobs.get(jobId)
  if (!job) return
  clearWatchdog(job)
  if (job.cleanupTimer) {
    clearTimeout(job.cleanupTimer)
    job.cleanupTimer = undefined
  }
  job.process?.kill()
  deleteJobDirectory(jobId)
  jobs.delete(jobId)
}

/** Jobs that are not in a terminal state — used to cap concurrent work. */
export function countActiveJobs(): number {
  let active = 0
  for (const job of jobs.values()) {
    if (
      job.status !== "completed" &&
      job.status !== "error" &&
      job.status !== "cancelled"
    ) {
      active += 1
    }
  }
  return active
}

/**
 * Called once a completed file has been fully streamed to the user's device.
 * The file lives on the server only as a short delivery buffer: it is deleted
 * after DELIVERED_JOB_TTL_MS so a failed browser download can be retried.
 * Transfers that never complete fall back to the regular JOB_TTL_MS cleanup.
 */
export function markJobDelivered(jobId: string): void {
  const job = jobs.get(jobId)
  if (!job || job.status !== "completed") return

  const graceMs = getDeliveredJobTtlMs()
  job.deliveredAt = Date.now()
  job.expiresAt = Math.min(job.expiresAt, job.deliveredAt + graceMs)

  if (job.cleanupTimer) clearTimeout(job.cleanupTimer)
  job.cleanupTimer = setTimeout(() => removeJob(jobId), graceMs)
  job.cleanupTimer.unref?.()
}

export function startJob(input: {
  id: string
  url: string
  title: string
  thumbnail?: string
  uploadDate?: string
  options: DownloadOptions
}): StoredJob {
  const jobDir = createJobDirectory(input.id)
  const now = Date.now()

  const job: StoredJob = {
    id: input.id,
    url: input.url,
    title: input.title,
    thumbnail: input.thumbnail,
    status: "queued",
    progress: 0,
    options: input.options,
    uploadDate: input.uploadDate,
    createdAt: now,
    expiresAt: now + getJobTtlMs(),
    jobDir,
    stderr: "",
    lastActivityAt: now,
  }

  jobs.set(job.id, job)
  queueMicrotask(() => runJob(job.id))
  return job
}

function runJob(jobId: string): void {
  const job = jobs.get(jobId)
  if (!job) return

  job.status = "downloading"
  job.lastActivityAt = Date.now()

  job.process = spawnDownload(
    job.url,
    job.options,
    job.jobDir,
    (line: string) => {
      const current = jobs.get(jobId)
      if (!current) return

      current.lastActivityAt = Date.now()
      current.stderr = `${current.stderr}\n${line}`.slice(-4000)
      const update = parseYtdlpOutputLine(line)
      if (!update) return

      if (update.status) current.status = update.status
      if (update.progress !== undefined) current.progress = update.progress
      if (update.speed) current.speed = update.speed
      if (update.eta) current.eta = update.eta
      if (update.processingPhase)
        current.processingPhase = update.processingPhase
      if (update.status === "processing") {
        current.speed = undefined
        current.eta = undefined
      }
      if (update.filePath) {
        current.filePath = update.filePath
        current.fileName = update.filePath.split(/[/\\]/).pop()
      }
    },
    (code: number | null) => completeOrFail(jobId, code)
  )

  job.watchdog = setInterval(() => {
    const current = jobs.get(jobId)
    if (!current?.process) {
      if (current) clearWatchdog(current)
      return
    }

    const idleMs = Date.now() - current.lastActivityAt
    const timeoutMs = getProcessingTimeoutMs()

    if (idleMs > timeoutMs) {
      current.processingPhase = "Merge timed out — retrying…"
      current.process?.kill()
    }
  }, 15_000)
  job.watchdog.unref?.()
}

export function scheduleCleanup(): void {
  const intervalMs = Math.min(getJobTtlMs(), 300_000)

  // Remove leftover directories from previous runs (crash, redeploy).
  try {
    sweepStaleJobDirectories(getJobTtlMs())
  } catch {
    // Non-fatal: temp folders are best-effort.
  }

  setInterval(() => {
    const now = Date.now()
    for (const [jobId, job] of jobs) {
      if (now >= job.expiresAt) {
        removeJob(jobId)
      }
    }
  }, intervalMs).unref?.()
}

scheduleCleanup()

export type { StoredJob }
