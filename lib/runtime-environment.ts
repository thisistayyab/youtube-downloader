import { YtdlpError } from "./ytdlp-runner"

/** True when running on Vercel or another read-only serverless platform. */
export function isServerlessRuntime(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.NETLIFY === "true"
  )
}

/**
 * Ensures the app runs on a host that can spawn yt-dlp/ffmpeg and write temp files.
 * Vercel and similar platforms cannot run this workload.
 */
export function assertSelfHostedRuntime(): void {
  if (!isServerlessRuntime()) return

  throw new YtdlpError(
    "Downloads are not available on this hosted site. Install Node.js, yt-dlp, and ffmpeg on your PC, " +
      "then run the app locally at http://localhost:3000. Open the PC Setup guide on this website for step-by-step instructions."
  )
}
