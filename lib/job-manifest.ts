import fs from "node:fs"
import path from "node:path"

import { findDownloadedFile, getDownloadRoot } from "./ytdlp-runner"

const MANIFEST_NAME = "job-manifest.json"

export interface JobManifest {
  jobId: string
  title: string
  fileName: string
  filePath: string
  completedAt: number
}

export function getJobDirectory(jobId: string): string {
  return path.join(getDownloadRoot(), jobId)
}

export function writeJobManifest(jobDir: string, manifest: JobManifest): void {
  fs.writeFileSync(
    path.join(jobDir, MANIFEST_NAME),
    JSON.stringify(manifest, null, 2),
    "utf8"
  )
}

export function readJobManifest(jobId: string): JobManifest | null {
  const manifestPath = path.join(getJobDirectory(jobId), MANIFEST_NAME)

  if (!fs.existsSync(manifestPath)) return null

  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as JobManifest
  } catch {
    return null
  }
}

export function isPathInside(child: string, parent: string): boolean {
  const resolvedChild = path.resolve(child)
  const resolvedParent = path.resolve(parent)
  const relative = path.relative(resolvedParent, resolvedChild)

  return relative !== ".." && !relative.startsWith(`..${path.sep}`)
}

export function resolveJobFile(jobId: string): {
  filePath: string
  fileName: string
  jobDir: string
} | null {
  const jobDir = getJobDirectory(jobId)

  if (!fs.existsSync(jobDir)) return null

  const manifest = readJobManifest(jobId)
  if (manifest?.filePath && fs.existsSync(manifest.filePath)) {
    return {
      filePath: manifest.filePath,
      fileName: manifest.fileName,
      jobDir,
    }
  }

  const discovered = findDownloadedFile(jobDir)
  if (!discovered) return null

  return {
    filePath: discovered,
    fileName: path.basename(discovered),
    jobDir,
  }
}

export function isJobFileReady(jobId: string, filePath?: string): boolean {
  if (filePath && fs.existsSync(filePath)) return true
  return resolveJobFile(jobId) !== null
}
