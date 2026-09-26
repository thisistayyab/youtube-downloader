#!/usr/bin/env node
/**
 * Provisions the binaries this app needs into ./bin so no global install is
 * required. Render's build command runs this automatically.
 *
 * - yt-dlp: standalone build for the current platform (always downloaded).
 * - ffmpeg: provided by Render's native runtime. Pass --with-ffmpeg to also
 *   fetch a static Linux build (useful for other hosts).
 *
 * Usage: npm run setup:binaries [-- --force] [-- --with-ffmpeg]
 */
import { execFileSync } from "node:child_process"
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { fileURLToPath } from "node:url"

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const BIN_DIR = path.join(PROJECT_ROOT, "bin")
const FORCE = process.argv.includes("--force")
const WITH_FFMPEG = process.argv.includes("--with-ffmpeg")

async function downloadToFile(url, destination) {
  const response = await fetch(url, { redirect: "follow" })
  if (!response.ok || !response.body) {
    throw new Error(`Download failed with HTTP ${response.status}: ${url}`)
  }

  const tempPath = `${destination}.partial`
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath))
  rmSync(destination, { force: true })
  renameSync(tempPath, destination)
}

function ytdlpAssetName() {
  if (process.platform === "win32") return "yt-dlp.exe"
  if (process.platform === "darwin") return "yt-dlp_macos"
  return process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux"
}

async function setupYtdlp() {
  const target = path.join(
    BIN_DIR,
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
  )

  if (existsSync(target) && !FORCE) {
    console.log(
      `[setup:binaries] yt-dlp already present (${target}) — skipping. Use --force to refresh.`
    )
    return
  }

  const asset = ytdlpAssetName()
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`

  console.log(`[setup:binaries] Downloading ${asset}…`)
  await downloadToFile(url, target)
  if (process.platform !== "win32") chmodSync(target, 0o755)
  console.log(`[setup:binaries] yt-dlp ready at ${target}`)
}

async function setupFfmpeg() {
  if (!WITH_FFMPEG) {
    console.log(
      "[setup:binaries] ffmpeg: skipped (Render provides it; use --with-ffmpeg for other Linux hosts)."
    )
    return
  }

  if (process.platform !== "linux") {
    console.log(
      "[setup:binaries] ffmpeg: --with-ffmpeg only supports Linux. Install ffmpeg via your package manager instead."
    )
    return
  }

  const target = path.join(BIN_DIR, "ffmpeg")
  if (existsSync(target) && !FORCE) {
    console.log(
      `[setup:binaries] ffmpeg already present (${target}) — skipping. Use --force to refresh.`
    )
    return
  }

  const arch = process.arch === "arm64" ? "linuxarm64" : "linux64"
  const url = `https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-${arch}-gpl.tar.xz`
  const archive = path.join(BIN_DIR, `ffmpeg-${arch}.tar.xz`)
  const extractDir = path.join(BIN_DIR, "ffmpeg-extract")

  console.log(`[setup:binaries] Downloading static ffmpeg (${arch})…`)
  await downloadToFile(url, archive)

  rmSync(extractDir, { recursive: true, force: true })
  mkdirSync(extractDir, { recursive: true })
  execFileSync("tar", ["-xJf", archive, "-C", extractDir], { stdio: "inherit" })

  const root = readdirSync(extractDir).find((name) => name.startsWith("ffmpeg-"))
  if (!root) throw new Error("Could not find the extracted ffmpeg build")

  for (const binary of ["ffmpeg", "ffprobe"]) {
    const source = path.join(extractDir, root, "bin", binary)
    const destination = path.join(BIN_DIR, binary)
    rmSync(destination, { force: true })
    renameSync(source, destination)
    chmodSync(destination, 0o755)
  }

  rmSync(extractDir, { recursive: true, force: true })
  rmSync(archive, { force: true })
  console.log("[setup:binaries] ffmpeg ready.")
}

async function main() {
  mkdirSync(BIN_DIR, { recursive: true })
  await setupYtdlp()
  await setupFfmpeg()
  console.log("[setup:binaries] Done.")
}

main().catch((error) => {
  console.error(
    `[setup:binaries] ${error instanceof Error ? error.message : error}`
  )
  process.exit(1)
})
