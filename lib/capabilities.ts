import {
  ensureFfmpegAvailable,
  ensureYtdlpAvailable,
  YtdlpError,
} from "./ytdlp-runner"

export interface ToolStatus {
  available: boolean
  version?: string
  error?: string
}

export interface AppCapabilities {
  downloadsAvailable: boolean
  message: string
  ytdlp: ToolStatus
  ffmpeg: ToolStatus
}

async function checkYtdlp(): Promise<ToolStatus> {
  try {
    const version = await ensureYtdlpAvailable()
    return { available: true, version }
  } catch (err) {
    return {
      available: false,
      error:
        err instanceof YtdlpError
          ? err.message
          : "yt-dlp not found on the server. Install it and add it to PATH, or set YTDLP_PATH.",
    }
  }
}

async function checkFfmpeg(): Promise<ToolStatus> {
  try {
    await ensureFfmpegAvailable()
    return { available: true }
  } catch (err) {
    return {
      available: false,
      error:
        err instanceof YtdlpError
          ? err.message
          : "ffmpeg not found on the server. Install it and add it to PATH, or set FFMPEG_PATH.",
    }
  }
}

export async function getAppCapabilities(): Promise<AppCapabilities> {
  const [ytdlp, ffmpeg] = await Promise.all([checkYtdlp(), checkFfmpeg()])

  const downloadsAvailable = ytdlp.available && ffmpeg.available

  return {
    downloadsAvailable,
    message: downloadsAvailable
      ? `Ready — yt-dlp ${ytdlp.version ?? "installed"}, ffmpeg available.`
      : "Downloads are disabled until yt-dlp and ffmpeg are available on this server.",
    ytdlp,
    ffmpeg,
  }
}
