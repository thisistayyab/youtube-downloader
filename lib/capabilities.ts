import { isServerlessRuntime } from "./runtime-environment"
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
  hostedMode: boolean
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
          : "yt-dlp not found. Install it and add to PATH, or set YTDLP_PATH.",
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
          : "ffmpeg not found. Install it and add to PATH, or set FFMPEG_PATH.",
    }
  }
}

export async function getAppCapabilities(): Promise<AppCapabilities> {
  const hostedMode = isServerlessRuntime()

  if (hostedMode) {
    return {
      downloadsAvailable: false,
      hostedMode: true,
      message:
        "This site is hosted on a serverless platform (Vercel, Netlify, etc.). " +
        "Downloads run on your own PC — follow the setup guide below, then use the app at http://localhost:3000.",
      ytdlp: {
        available: false,
        error: "Install yt-dlp on your PC (see setup guide).",
      },
      ffmpeg: {
        available: false,
        error: "Install ffmpeg on your PC (see setup guide).",
      },
    }
  }

  const [ytdlp, ffmpeg] = await Promise.all([checkYtdlp(), checkFfmpeg()])

  const downloadsAvailable = ytdlp.available && ffmpeg.available

  return {
    downloadsAvailable,
    hostedMode: false,
    message: downloadsAvailable
      ? `Ready — yt-dlp ${ytdlp.version ?? "installed"}, ffmpeg available.`
      : "Install missing tools on this PC to enable downloads.",
    ytdlp,
    ffmpeg,
  }
}
