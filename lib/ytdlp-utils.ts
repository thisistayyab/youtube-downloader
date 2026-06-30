import type { FormatCategory, YtdlpFormat, YtdlpVideoInfo } from "./ytdlp-types"

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/|playlist\?list=)|youtu\.be\/)/i

export function isValidYoutubeUrl(url: string): boolean {
  try {
    const trimmed = url.trim()
    if (!trimmed) return false
    return YOUTUBE_URL_RE.test(trimmed)
  } catch {
    return false
  }
}

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("/")[0] || null
    }
    const v = parsed.searchParams.get("v")
    if (v) return v
    const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/)
    if (shortsMatch) return shortsMatch[1]
    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/)
    if (embedMatch) return embedMatch[1]
  } catch {
    return null
  }
  return null
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Unknown size"
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function formatViewCount(count?: number): string {
  if (!count) return "—"
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B views`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`
  return `${count} views`
}

export function formatUploadDate(yyyymmdd?: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "—"
  const y = yyyymmdd.slice(0, 4)
  const m = yyyymmdd.slice(4, 6)
  const d = yyyymmdd.slice(6, 8)
  return new Date(`${y}-${m}-${d}`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function hasVideoCodec(format: YtdlpFormat): boolean {
  return !!format.vcodec && format.vcodec !== "none"
}

function isHdrFormat(format: YtdlpFormat): boolean {
  return !!format.format_note?.includes("HDR")
}

/** Highest video height YouTube returned for this video (0 if unknown). */
export function getMaxVideoHeight(formats: YtdlpFormat[]): number {
  let max = 0
  for (const format of formats) {
    if (hasVideoCodec(format) && format.height) {
      max = Math.max(max, format.height)
    }
  }
  return max
}

export function videoHasHdr(formats: YtdlpFormat[]): boolean {
  return formats.some((f) => hasVideoCodec(f) && isHdrFormat(f))
}

export function formatMaxResolutionLabel(maxHeight: number): string {
  if (maxHeight >= 2160) return "4K"
  if (maxHeight >= 1440) return "1440p"
  if (maxHeight >= 1080) return "1080p"
  if (maxHeight >= 720) return "720p"
  if (maxHeight >= 480) return "480p"
  if (maxHeight > 0) return `${maxHeight}p`
  return "unknown"
}

/** Presets that match what this video actually offers on YouTube. */
export function getAvailablePresets(info: YtdlpVideoInfo) {
  const maxHeight = getMaxVideoHeight(info.formats)
  const hdr = videoHasHdr(info.formats)

  return PRESET_FORMATS.filter((preset) => {
    if (preset.id === "4k-sdr-mp4") return maxHeight >= 2160
    if (preset.id === "4k-hdr-mp4" || preset.id === "4k-hdr-mkv") {
      return maxHeight >= 2160 && hdr
    }
    return true
  })
}

export function getDefaultPresetForVideo(info: YtdlpVideoInfo) {
  const available = getAvailablePresets(info)
  return (
    available.find((p) => p.id === "1080p-mp4") ??
    available.find((p) => p.id === "720p") ??
    available[0]
  )
}

export function getVideoFormatOptionValues(info: YtdlpVideoInfo): string[] {
  const grouped = groupFormats(info.formats)
  const qualityPresets = getVideoQualityPresets(info)
  return [
    ...qualityPresets.map((p) => p.value),
    ...grouped.combined.map((f) => f.format_id),
    ...grouped.videoOnly.map(
      (f) => `${f.format_id}+bestaudio[ext=m4a]/bestaudio`
    ),
  ]
}

export function getAudioFormatOptionValues(info: YtdlpVideoInfo): string[] {
  return groupFormats(info.formats).audioOnly.map((f) => f.format_id)
}

export function resolveVideoSelectValue(
  info: YtdlpVideoInfo,
  format: string
): string | undefined {
  const options = getVideoFormatOptionValues(info)
  if (options.length === 0) return undefined
  if (options.includes(format)) return format
  const best = getBestVideoFormatId(info)
  if (options.includes(best)) return best
  return options[0]
}

export function resolveAudioSelectValue(
  info: YtdlpVideoInfo,
  format: string
): string | undefined {
  const options = getAudioFormatOptionValues(info)
  if (options.length === 0) return undefined
  if (options.includes(format)) return format
  const best = getBestAudioFormatId(info)
  if (options.includes(best)) return best
  return options[0]
}

export function resolveCustomPresetId(
  info: YtdlpVideoInfo,
  format: string
): string {
  const available = getAvailablePresets(info)
  return (
    available.find((p) => p.value === format)?.id ??
    getDefaultPresetForVideo(info).id
  )
}

function hasAudioCodec(format: YtdlpFormat): boolean {
  return !!format.acodec && format.acodec !== "none"
}

export function categorizeFormat(format: YtdlpFormat): FormatCategory | null {
  const video = hasVideoCodec(format)
  const audio = hasAudioCodec(format)
  if (video && audio) return "video"
  if (video && !audio) return "video"
  if (!video && audio) return "audio"
  return null
}

export interface GroupedFormats {
  combined: YtdlpFormat[]
  videoOnly: YtdlpFormat[]
  audioOnly: YtdlpFormat[]
}

export function groupFormats(formats: YtdlpFormat[]): GroupedFormats {
  const combined: YtdlpFormat[] = []
  const videoOnly: YtdlpFormat[] = []
  const audioOnly: YtdlpFormat[] = []

  for (const format of formats) {
    const video = hasVideoCodec(format)
    const audio = hasAudioCodec(format)
    if (video && audio) combined.push(format)
    else if (video) videoOnly.push(format)
    else if (audio) audioOnly.push(format)
  }

  const byHeight = (a: YtdlpFormat, b: YtdlpFormat) =>
    (b.height ?? 0) - (a.height ?? 0)

  combined.sort(byHeight)
  videoOnly.sort(byHeight)
  audioOnly.sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0))

  return { combined, videoOnly, audioOnly }
}

export function formatLabel(format: YtdlpFormat): string {
  const parts: string[] = []
  if (format.height) parts.push(`${format.height}p`)
  else if (format.resolution) parts.push(format.resolution)
  if (format.fps && format.fps > 30) parts.push(`${format.fps}fps`)
  if (format.ext) parts.push(format.ext.toUpperCase())
  if (format.vcodec && format.vcodec !== "none") {
    parts.push(format.vcodec.split(".")[0])
  }
  if (format.acodec && format.acodec !== "none") {
    parts.push(format.acodec.split(".")[0])
  }
  if (format.format_note) parts.push(format.format_note)
  const size = format.filesize ?? format.filesize_approx
  if (size) parts.push(formatFileSize(size))
  return parts.filter(Boolean).join(" · ") || format.format_id
}

function videoWithAudioValue(
  video: YtdlpFormat,
  audioOnly: YtdlpFormat[]
): string {
  const m4a = audioOnly.find((f) => f.ext === "m4a")
  if (m4a) return `${video.format_id}+${m4a.format_id}`
  return `${video.format_id}+bestaudio/best`
}

/** Returns a Select-compatible value (format_id or id+id), not a yt-dlp filter string. */
export function getBestVideoFormatId(info: YtdlpVideoInfo): string {
  const { combined, videoOnly, audioOnly } = groupFormats(info.formats)

  const combined1080 =
    combined.find((f) => f.height === 1080) ??
    combined.find((f) => f.height && f.height <= 1080)
  if (combined1080) return combined1080.format_id

  const video1080 =
    videoOnly.find((f) => f.height === 1080 && f.ext === "mp4") ??
    videoOnly.find((f) => f.height === 1080) ??
    videoOnly.find((f) => f.height && f.height <= 1080 && f.ext === "mp4") ??
    videoOnly.find((f) => f.height && f.height <= 1080) ??
    videoOnly[0]

  if (video1080) return videoWithAudioValue(video1080, audioOnly)
  if (combined[0]) return combined[0].format_id

  return PRESET_FORMATS[0].value
}

export function getVideoQualityPresets(
  info: YtdlpVideoInfo
): { label: string; value: string }[] {
  const { videoOnly, audioOnly } = groupFormats(info.formats)
  const m4a = audioOnly.find((f) => f.ext === "m4a")
  const seen = new Set<string>()
  const presets: { label: string; value: string }[] = []

  for (const height of [2160, 1080, 720, 480, 360, 240]) {
    const candidates = videoOnly.filter((f) => f.height === height)
    const video =
      (height === 2160
        ? candidates.find((f) => !f.format_note?.includes("HDR"))
        : undefined) ??
      candidates.find((f) => f.ext === "mp4") ??
      candidates[0]
    if (!video) continue

    const value = videoWithAudioValue(video, audioOnly)
    if (seen.has(value)) continue
    seen.add(value)

    const hdr = video.format_note?.includes("HDR") ? " HDR" : ""
    const suffix = m4a ? " + AAC" : " + best audio"
    const size = video.filesize ?? video.filesize_approx
    const sizeHint = size ? ` · ~${formatFileSize(size)}` : ""
    presets.push({
      label: `${height}p${hdr}${suffix}${sizeHint} · ${formatLabel(video)}`,
      value,
    })

    if (height === 2160) {
      const hdrVideo = candidates.find((f) => f.format_note?.includes("HDR"))
      if (hdrVideo) {
        const hdrValue = videoWithAudioValue(hdrVideo, audioOnly)
        if (!seen.has(hdrValue)) {
          seen.add(hdrValue)
          const hdrSize = hdrVideo.filesize ?? hdrVideo.filesize_approx
          presets.push({
            label: `2160p HDR + AAC${hdrSize ? ` · ~${formatFileSize(hdrSize)}` : ""} · ${formatLabel(hdrVideo)}`,
            value: hdrValue,
          })
        }
      }
    }
  }

  return presets
}

export function getBestAudioFormatId(info: YtdlpVideoInfo): string {
  const { audioOnly } = groupFormats(info.formats)
  return audioOnly[0]?.format_id ?? "bestaudio"
}

export function buildFormatString(
  formatId: string,
  category: FormatCategory,
  mergeFormat: "mp4" | "mkv" | "webm" = "mp4"
): string {
  if (category === "custom") return formatId
  if (category === "audio") {
    return formatId === "bestaudio" ? "bestaudio/best" : formatId
  }
  if (formatId.includes("+")) return formatId
  return `${formatId}+bestaudio[ext=m4a]/bestaudio`
}

export const DEFAULT_OUTPUT_TEMPLATE = "%(title)s.%(ext)s"

/** yt-dlp -o template: ASCII-safe while downloading (avoids ffmpeg failures on Windows). */
export const INTERNAL_OUTPUT_TEMPLATE = "%(id)s.%(ext)s"

/** Reliable 1080p MP4 + AAC — avoids 4K VP9→MP4 merge hangs on Windows. */
export const DEFAULT_FORMAT =
  "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best"

export const PRESET_FORMATS = [
  {
    id: "1080p-mp4",
    label: "1080p MP4 (recommended)",
    value:
      "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best",
    mergeOutputFormat: "mp4" as const,
  },
  {
    id: "4k-sdr-mp4",
    label: "4K SDR MP4 + AAC (~190 MB)",
    value:
      "bestvideo[height=2160][format_note!*=HDR]+bestaudio[ext=m4a]/bestvideo[height=2160]+bestaudio[ext=m4a]",
    mergeOutputFormat: "mp4" as const,
  },
  {
    id: "4k-hdr-mp4",
    label: "4K HDR MP4 + AAC (~380 MB)",
    value:
      "bestvideo[height=2160][format_note*=HDR]+bestaudio[ext=m4a]/bestvideo[height=2160]+bestaudio[ext=m4a]",
    mergeOutputFormat: "mp4" as const,
  },
  {
    id: "4k-hdr-mkv",
    label: "4K HDR MKV + AAC (~380 MB)",
    value:
      "bestvideo[height=2160][format_note*=HDR]+bestaudio[ext=m4a]/bestvideo+bestaudio[ext=m4a]/best",
    mergeOutputFormat: "mkv" as const,
  },
  {
    id: "best-mp4-aac",
    label: "Best MP4 + AAC",
    value:
      "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
  },
  {
    id: "720p",
    label: "720p max",
    value: "bestvideo[height<=720]+bestaudio[ext=m4a]/best",
  },
  {
    id: "480p",
    label: "480p max",
    value: "bestvideo[height<=480]+bestaudio[ext=m4a]/best",
  },
  {
    id: "audio-best",
    label: "Audio only (best)",
    value: "bestaudio/best",
  },
  {
    id: "audio-mp3",
    label: "Audio MP3",
    value: "bestaudio --extract-audio --audio-format mp3",
  },
] as const

export function parseUploadDate(yyyymmdd?: string): Date | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null
  const year = Number.parseInt(yyyymmdd.slice(0, 4), 10)
  const month = Number.parseInt(yyyymmdd.slice(4, 6), 10) - 1
  const day = Number.parseInt(yyyymmdd.slice(6, 8), 10)
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null
  return new Date(year, month, day, 12, 0, 0)
}

const WINDOWS_INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

/** Undo accidental URL-encoding in titles (%20, %E2%96%AA, etc.). */
export function decodeYoutubeTitle(title: string): string {
  const trimmed = title.trim()
  if (!/%[0-9A-Fa-f]{2}/.test(trimmed)) return trimmed

  try {
    return decodeURIComponent(trimmed.replace(/\+/g, " "))
  } catch {
    return trimmed.replace(/%20/g, " ").replace(/\+/g, " ")
  }
}

export function buildContentDisposition(fileName: string): string {
  const asciiFallback = fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_")
    .slice(0, 180)
  const utf8 = encodeURIComponent(fileName)
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`
}

/** Safe final filename from YouTube title (colons, bullets, etc. removed). */
export function sanitizeWindowsFilename(title: string, ext: string): string {
  const extension = ext.startsWith(".") ? ext : `.${ext}`
  let safe = decodeYoutubeTitle(title)
    .replace(WINDOWS_INVALID_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/g, "")

  if (!safe) safe = "video"

  const maxBase = 200 - extension.length
  if (safe.length > maxBase) {
    safe = safe.slice(0, maxBase).trim().replace(/[.\s]+$/g, "")
  }

  return `${safe}${extension}`
}
