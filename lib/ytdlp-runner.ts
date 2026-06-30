import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import type { DownloadOptions, YtdlpVideoInfo } from "./ytdlp-types"
import {
  INTERNAL_OUTPUT_TEMPLATE,
  parseUploadDate,
  sanitizeWindowsFilename,
} from "./ytdlp-utils"

const BLOCKED_EXTRA_ARGS = new Set([
  "--exec",
  "--exec-before-download",
  "--config-location",
  "--batch-file",
  "--download-archive",
  "--load-info-json",
  "--output",
  "-o",
  "-f",
  "--format",
])

export class YtdlpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "YtdlpError"
  }
}

/** Resolve yt-dlp binary. Override with YTDLP_PATH (e.g. C:\\tools\\yt-dlp.exe). */
export function getYtdlpExecutable(): string {
  if (process.env.YTDLP_PATH?.trim()) {
    return process.env.YTDLP_PATH.trim()
  }
  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
}

/** Optional ffmpeg path for yt-dlp --ffmpeg-location (required for merge/embed). */
export function getFfmpegLocation(): string | undefined {
  const raw = process.env.FFMPEG_PATH?.trim()
  if (!raw) return undefined

  const resolved = path.resolve(raw)

  try {
    if (fs.existsSync(resolved)) {
      if (fs.statSync(resolved).isDirectory()) {
        return resolved
      }
      return path.dirname(resolved)
    }
  } catch {
    // Fall through to raw value.
  }

  return raw
}

export function getFfmpegExecutable(): string {
  const location = getFfmpegLocation()
  if (!location) {
    return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  }

  const exeName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  const asFile = path.join(location, exeName)

  try {
    if (fs.existsSync(asFile)) return asFile
  } catch {
    // Fall through.
  }

  return location
}

export function requiresFfmpeg(options: DownloadOptions): boolean {
  return (
    options.embedThumbnail ||
    options.embedMetadata ||
    options.embedSubs ||
    options.writeSubs ||
    options.writeAutoSubs ||
    options.convertOpusToAac ||
    !options.format.includes("best")
  )
}

export function getDownloadRoot(): string {
  const root = process.env.DOWNLOAD_DIR?.trim() || path.join(process.cwd(), "downloads")
  return path.resolve(root)
}

export function getJobTtlMs(): number {
  const raw = process.env.JOB_TTL_MS?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : 3_600_000
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3_600_000
}

/** Kill a stuck merge if no output for this long (ms). */
export function getProcessingTimeoutMs(): number {
  const raw = process.env.PROCESSING_TIMEOUT_MS?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : 600_000
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 600_000
}

export async function ensureFfmpegAvailable(): Promise<void> {
  const ffmpegPath = getFfmpegExecutable()

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ["-version"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })

    proc.on("error", () => {
      reject(
        new YtdlpError(
          "ffmpeg not found. Install ffmpeg and add it to PATH, or set FFMPEG_PATH. " +
            "ffmpeg is required to merge video/audio and embed metadata/thumbnails."
        )
      )
    })

    proc.on("close", (code) => {
      if (code === 0) resolve()
      else
        reject(
          new YtdlpError(
            "ffmpeg is installed but returned an error. Check FFMPEG_PATH if set."
          )
        )
    })
  })
}

export async function ensureYtdlpAvailable(): Promise<string> {
  const executable = getYtdlpExecutable()

  return new Promise((resolve, reject) => {
    const proc = spawn(executable, ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on("error", (err) => {
      reject(
        new YtdlpError(
          `yt-dlp not found (${executable}). Install yt-dlp and ensure it is on PATH, or set YTDLP_PATH. ${err.message}`
        )
      )
    })

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim().split("\n")[0] ?? "unknown")
        return
      }
      reject(
        new YtdlpError(
          stderr.trim() ||
            `yt-dlp exited with code ${code}. Set YTDLP_PATH if the binary is not on PATH.`
        )
      )
    })
  })
}

export async function fetchVideoInfo(url: string): Promise<YtdlpVideoInfo> {
  await ensureYtdlpAvailable()

  return new Promise((resolve, reject) => {
    const args = ["--dump-json", "--no-playlist", "--no-warnings", url]
    const proc = spawn(getYtdlpExecutable(), args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on("error", (err) => {
      reject(new YtdlpError(`Failed to start yt-dlp: ${err.message}`))
    })

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new YtdlpError(sanitizeYtdlpMessage(stderr) || "Failed to fetch video info"))
        return
      }

      try {
        const parsed = JSON.parse(stdout) as YtdlpVideoInfo
        resolve(parsed)
      } catch {
        reject(new YtdlpError("yt-dlp returned invalid JSON"))
      }
    })
  })
}

export function buildYtdlpArgs(
  url: string,
  options: DownloadOptions,
  outputDir: string
): string[] {
  // Use video id for paths during download — titles with ":" or "▪" break ffmpeg on Windows.
  const outputPath = path.join(outputDir, INTERNAL_OUTPUT_TEMPLATE)

  const args = [
    "--no-warnings",
    "--newline",
    "--progress",
    "--no-playlist",
    "--no-mtime",
    "--windows-filenames",
    "--retries",
    "3",
    "-f",
    options.format,
    "-o",
    outputPath,
    "--merge-output-format",
    options.mergeOutputFormat,
  ]

  const ffmpegLocation = getFfmpegLocation()
  if (ffmpegLocation) {
    args.push("--ffmpeg-location", ffmpegLocation)
  }

  // MP4 + Windows Media Player: mux AAC (re-encode only if stream isn't already AAC).
  if (options.mergeOutputFormat === "mp4" && !options.audioOnly) {
    args.push(
      "--postprocessor-args",
      "Merger+ffmpeg:-c:v copy -c:a aac -b:a 192k"
    )
  }

  if (options.embedThumbnail) args.push("--embed-thumbnail")
  if (options.embedMetadata) args.push("--embed-metadata")
  if (options.writeSubs) args.push("--write-subs")
  if (options.writeAutoSubs) args.push("--write-auto-subs")
  if (options.embedSubs) args.push("--embed-subs")

  if ((options.writeSubs || options.writeAutoSubs) && options.subLangs.trim()) {
    args.push("--sub-langs", options.subLangs.trim())
  }

  args.push(...parseExtraArgs(options.extraArgs))
  args.push(url)

  return args
}

export function parseExtraArgs(raw: string): string[] {
  if (!raw.trim()) return []

  const tokens = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  const args: string[] = []

  for (const token of tokens) {
    const cleaned = token.replace(/^['"]|['"]$/g, "")
    const flag = cleaned.split("=")[0]

    if (BLOCKED_EXTRA_ARGS.has(flag)) {
      throw new YtdlpError(`Extra argument not allowed: ${flag}`)
    }

    args.push(cleaned)
  }

  return args
}

export interface ProgressUpdate {
  status?: "downloading" | "processing"
  progress?: number
  speed?: string
  eta?: string
  filePath?: string
  processingPhase?: string
}

const PROCESSING_PHASES: Record<string, string> = {
  Merger: "Merging video & audio…",
  ExtractAudio: "Extracting audio",
  EmbedThumbnail: "Embedding thumbnail",
  Metadata: "Writing metadata",
  Fixup: "Finalizing file",
}

export function parseYtdlpOutputLine(line: string): ProgressUpdate | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const downloadMatch = trimmed.match(/\[download\]\s+([\d.]+)%/)
  if (downloadMatch) {
    const speedMatch = trimmed.match(/at\s+([\d.]+\s*\w+\/s)/i)
    const etaMatch = trimmed.match(/ETA\s+(\S+)/i)
    return {
      status: "downloading",
      progress: Number.parseFloat(downloadMatch[1]),
      speed: speedMatch?.[1],
      eta: etaMatch?.[1],
    }
  }

  for (const [tag, phase] of Object.entries(PROCESSING_PHASES)) {
    if (trimmed.startsWith(`[${tag}]`)) {
      return {
        status: "processing",
        progress: 99,
        processingPhase: phase,
      }
    }
  }

  const destinationMatch = trimmed.match(/\[download\]\s+Destination:\s+(.+)/)
  if (destinationMatch) {
    return { filePath: destinationMatch[1].trim() }
  }

  const mergedMatch = trimmed.match(/Merging formats into "(.+?)"/)
  if (mergedMatch) {
    return {
      filePath: mergedMatch[1],
      status: "processing",
      progress: 99,
      processingPhase: "Merging video & audio…",
    }
  }

  return null
}

export function findDownloadedFile(jobDir: string): string | undefined {
  if (!fs.existsSync(jobDir)) return undefined

  const entries = fs.readdirSync(jobDir, { withFileTypes: true })
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.endsWith(".part") &&
        !entry.name.endsWith(".ytdl") &&
        !entry.name.endsWith(".json") &&
        !/\.f\d+[-.]/.test(entry.name)
    )
    .map((entry) => {
      const fullPath = path.join(jobDir, entry.name)
      const stat = fs.statSync(fullPath)
      return { fullPath, size: stat.size, mtime: stat.mtimeMs }
    })
    .sort((a, b) => b.size - a.size || b.mtime - a.mtime)

  return files[0]?.fullPath
}

/** Prefer the final merged file — job.filePath may still point at a deleted .f337.webm. */
export function resolveJobOutputFile(
  jobDir: string,
  hintedPath: string | undefined,
  mergeFormat: "mp4" | "mkv" | "webm"
): string | undefined {
  const candidates: string[] = []

  if (hintedPath) candidates.push(hintedPath)
  const scanned = findDownloadedFile(jobDir)
  if (scanned) candidates.push(scanned)
  const merged = tryManualMerge(jobDir, mergeFormat)
  if (merged) candidates.push(merged)
  const rescanned = findDownloadedFile(jobDir)
  if (rescanned) candidates.push(rescanned)

  const seen = new Set<string>()
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate)
    if (seen.has(resolved)) continue
    seen.add(resolved)
    if (fs.existsSync(resolved)) return resolved
  }

  return undefined
}

interface StreamFile {
  path: string
  name: string
  size: number
  isAudio: boolean
}

function listStreamFiles(jobDir: string): StreamFile[] {
  if (!fs.existsSync(jobDir)) return []

  return fs
    .readdirSync(jobDir)
    .filter(
      (name) =>
        !name.endsWith(".part") &&
        !name.endsWith(".webp") &&
        !name.endsWith(".json") &&
        !name.endsWith(".ytdl")
    )
    .map((name) => {
      const fullPath = path.join(jobDir, name)
      const stat = fs.statSync(fullPath)
      if (!stat.isFile()) return null
      const isAudio = /\.m4a$/i.test(name) || /\.f\d+-?audio/i.test(name)
      const isVideo =
        /\.(mp4|webm|mkv)$/i.test(name) &&
        (/\.f\d+\./.test(name) || stat.size > 2_000_000)
      if (!isAudio && !isVideo) return null
      return {
        path: fullPath,
        name,
        size: stat.size,
        isAudio: isAudio || (!isVideo && stat.size < 10_000_000),
      }
    })
    .filter((entry): entry is StreamFile => entry !== null)
}

/** Merge separate yt-dlp streams when yt-dlp merger hangs (common with 4K VP9→MP4). */
export function tryManualMerge(
  jobDir: string,
  mergeFormat: "mp4" | "mkv" | "webm" = "mp4"
): string | undefined {
  const streams = listStreamFiles(jobDir)
  const merged = streams.find(
    (f) => !/\.f[\d-]+\./.test(f.name) && /\.(mp4|mkv|webm)$/i.test(f.name)
  )
  if (merged) return merged.path

  const audio =
    streams.find((f) => f.isAudio || /\.m4a$/i.test(f.name)) ??
    streams.filter((f) => /\.webm$/i.test(f.name)).sort((a, b) => a.size - b.size)[0]
  const video = streams
    .filter((f) => f !== audio && /\.(mp4|webm|mkv)$/i.test(f.name))
    .sort((a, b) => b.size - a.size)[0]

  if (!audio || !video) return undefined

  const baseName = video.name.replace(/\.f[\d-]+\.[^.]+$/i, "").replace(/\.[^.]+$/i, "")
  const outputPath = path.join(jobDir, `${baseName}.${mergeFormat}`)
  const ffmpeg = getFfmpegExecutable()

  const audioArgs =
    mergeFormat === "mp4"
      ? ["-c:a", "aac", "-b:a", "192k"]
      : ["-c:a", "copy"]

  const result = spawnSync(
    ffmpeg,
    ["-y", "-i", video.path, "-i", audio.path, "-c:v", "copy", ...audioArgs, outputPath],
    { windowsHide: true, encoding: "utf8" }
  )

  if (result.status !== 0 || !fs.existsSync(outputPath)) {
    if (mergeFormat === "mp4") {
      return tryManualMerge(jobDir, "mkv")
    }
    return undefined
  }

  for (const stream of [video, audio]) {
    if (stream.path !== outputPath) {
      try {
        fs.unlinkSync(stream.path)
      } catch {
        // ignore cleanup errors
      }
    }
  }

  return outputPath
}

export function sanitizeYtdlpMessage(message: string): string {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const errorLine = lines.find((line) => /^ERROR:/i.test(line))
  if (errorLine) return errorLine.replace(/^ERROR:\s*/i, "").slice(0, 500)

  return lines
    .filter((line) => !line.startsWith("WARNING:"))
    .slice(-3)
    .join(" ")
    .slice(0, 500)
}

export function applyUploadDateToFile(
  filePath: string,
  uploadDate?: string
): void {
  if (!uploadDate) return

  const date = parseUploadDate(uploadDate)
  if (!date) return

  try {
    fs.utimesSync(filePath, date, date)
  } catch {
    // Non-fatal if timestamp cannot be set.
  }
}

export function renameToYoutubeTitle(
  filePath: string,
  title: string
): string {
  const ext = path.extname(filePath) || ".mp4"
  const targetPath = path.join(path.dirname(filePath), sanitizeWindowsFilename(title, ext))

  if (path.resolve(filePath) === path.resolve(targetPath)) {
    return filePath
  }

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath)
  }

  fs.renameSync(filePath, targetPath)
  return targetPath
}

export function ensureDownloadRoot(): string {
  const root = getDownloadRoot()
  fs.mkdirSync(root, { recursive: true })
  return root
}

export function createJobDirectory(jobId: string): string {
  const root = ensureDownloadRoot()
  const jobDir = path.join(root, jobId)
  fs.mkdirSync(jobDir, { recursive: true })
  return jobDir
}

export function deleteJobDirectory(jobId: string): void {
  const jobDir = path.join(getDownloadRoot(), jobId)
  if (!fs.existsSync(jobDir)) return
  fs.rmSync(jobDir, { recursive: true, force: true })
}

export interface RunningProcess {
  kill: () => void
}

export function spawnDownload(
  url: string,
  options: DownloadOptions,
  outputDir: string,
  onLine: (line: string) => void,
  onClose: (code: number | null, signal: NodeJS.Signals | null) => void
): RunningProcess {
  const args = buildYtdlpArgs(url, options, outputDir)
  const proc = spawn(getYtdlpExecutable(), args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    cwd: outputDir,
  })

  let stderrBuffer = ""

  const handleChunk = (chunk: Buffer) => {
    stderrBuffer += chunk.toString()
    const lines = stderrBuffer.split(/\r?\n/)
    stderrBuffer = lines.pop() ?? ""
    for (const line of lines) {
      onLine(line)
    }
  }

  proc.stderr.on("data", handleChunk)
  proc.stdout.on("data", handleChunk)

  proc.on("close", (code, signal) => {
    if (stderrBuffer.trim()) onLine(stderrBuffer)
    onClose(code, signal)
  })

  proc.on("error", () => {
    onClose(1, null)
  })

  return {
    kill: () => {
      proc.kill("SIGTERM")
    },
  }
}
