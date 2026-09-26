# YouTube Downloader

A self-hosted web app that turns YouTube videos and playlists into files on **your own device**.

yt-dlp and ffmpeg run on the server, and the finished file is streamed straight to your browser's download folder. The server keeps files only as a short-lived delivery buffer — each file is deleted as soon as it has been handed to your device.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, and shadcn/ui. Designed for any Node.js host — with a turnkey [Render](https://render.com) deployment via [`render.yaml`](render.yaml).

---

## Contents

- [Legal and personal use](#legal-and-personal-use)
- [How it works](#how-it-works)
- [Quick start (local)](#quick-start-local)
- [Deploy to Render](#deploy-to-render)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [NPM scripts](#npm-scripts)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)

---

## Legal and personal use

This software is intended for **personal use on servers you control**.

You may use it when:

- You **own** the content (your own uploads, backups of your channel).
- The copyright holder has **given you permission** to download.
- Your use falls under an applicable **legal exception** in your country.

Do not use it to download copyrighted content you have no rights to, to redistribute or sell downloaded media, or to build commercial piracy services.

Also respect the [YouTube Terms of Service](https://www.youtube.com/t/terms) and copyright law in your country. You are responsible for what you download and for who can reach your deployment — put it behind authentication if it is publicly reachable.

---

## How it works

```
Browser                              Server (Node.js)
   │  POST /api/info ──────────────────▶  yt-dlp reads metadata + formats
   │  POST /api/download ─────────────▶  job queued → yt-dlp downloads → ffmpeg merges
   │  GET  /api/jobs/:id (poll) ◀──────  progress updates
   │  GET  /api/jobs/:id/file ◀────────  file streamed to your device
   ▼
Browser's Downloads folder           Temp file removed from the server
```

- **Server-side processing.** yt-dlp downloads streams and ffmpeg merges video + audio when needed.
- **Delivery to your device.** When a job completes, the app automatically hands the file to your browser's download manager — a `HEAD` preflight checks the file is ready, then a normal browser download starts (no full-file buffering in memory). A **Save again** button remains available in the queue during the retry window.
- **The server stays clean.**
  - After a successful delivery, the file is kept for `DELIVERED_JOB_TTL_MS` (default **5 minutes**) as a retry window, then deleted from the server.
  - Jobs that are never delivered are deleted after `JOB_TTL_MS` (default **1 hour**).
  - On startup, stale directories left over from crashes or redeploys are swept automatically.

### Guardrails

| Guard | Default | Env var |
|-------|---------|---------|
| Parallel downloads per instance | 3 | `MAX_CONCURRENT_JOBS` |
| Metadata requests per minute per IP | 30 | `RATE_LIMIT_INFO_PER_MIN` |
| Download requests per minute per IP | 10 | `RATE_LIMIT_DOWNLOAD_PER_MIN` |

Rate limits are in-memory (single instance). Exceeding them returns `429` with a `Retry-After` header.

---

## Quick start (local)

**Prerequisites**

- Node.js 20+
- ffmpeg on your PATH ([install guide](https://ffmpeg.org/download.html), or use your package manager)
- yt-dlp — no need to install it; the setup step below fetches it for you

```bash
git clone https://github.com/thisistayyab/youtube-downloader.git
cd youtube-downloader
npm install
npm run setup:binaries   # downloads the standalone yt-dlp into ./bin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a YouTube URL, pick a format, and download. Completed files land in your browser's Downloads folder automatically.

On Linux you can also skip installing ffmpeg system-wide:

```bash
npm run setup:binaries -- --with-ffmpeg   # static Linux build into ./bin
```

If ffmpeg lives outside your PATH, point `FFMPEG_PATH` at it in `.env.local` (see [Environment variables](#environment-variables)).

---

## Deploy to Render

Render's native Node runtime fits this app well: it provides ffmpeg, and its ephemeral disk is exactly what a delivery buffer needs. [`render.yaml`](render.yaml) is a ready-to-use [Blueprint](https://render.com/docs/blueprint-spec).

### Option A — Blueprint (recommended)

1. Push this repository to GitHub.
2. In the Render dashboard, click **New → Blueprint** and select the repo.
3. Render reads `render.yaml` and proposes the service — click **Apply**.
4. Wait for the first build to finish, then open the service URL.

The Blueprint configures:

| Setting | Value |
|---------|-------|
| Runtime | Node (native) |
| Build command | `npm ci && npm run setup:binaries -- --with-ffmpeg && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Plan / region | `starter` / `oregon` — change in [`render.yaml`](render.yaml) |

### Option B — Manual web service

Create a **Web Service** in the dashboard with the same build command, start command, and health check path. No Docker or additional configuration needed.

### Render notes

- **yt-dlp freshness** — the build downloads the latest yt-dlp release into `./bin`. YouTube changes often; if downloads suddenly fail, redeploy to refresh it (`autoDeployTrigger: commit` redeploys on every push).
- **Ephemeral disk** — files live under `/tmp/youtube-downloader` (`DOWNLOAD_DIR`) and are deleted after delivery. No persistent disk required.
- **Sizing** — 4K merges are CPU-heavy. `starter` (512 MB / 0.5 CPU) is fine for light use; scale up for concurrent 4K traffic.
- **Single instance** — the job store and rate limiter are in-memory, so keep the service on one instance.

---

## Environment variables

Local development reads `.env.local` (copy from [`.env.example`](.env.example)). On Render, set overrides in the dashboard or directly in `render.yaml`.

| Variable | Default | Description |
|----------|---------|-------------|
| `YTDLP_PATH` | `./bin/yt-dlp`, then PATH | Full path to the yt-dlp executable |
| `FFMPEG_PATH` | ffmpeg on PATH | Path to the ffmpeg binary or its `bin` folder |
| `COOKIES_PATH` | `./cookies.txt` (if present) | Path to Netscape format cookies.txt file |
| `YOUTUBE_COOKIES` | unset | Raw Netscape cookie content directly as an env var |
| `YTDLP_PROXY` | unset | Proxy URL to route yt-dlp traffic through |
| `DOWNLOAD_DIR` | `./downloads` | Temp folder for in-flight downloads |
| `JOB_TTL_MS` | `3600000` (1 h) | Delete jobs/files that were never delivered after this |
| `DELIVERED_JOB_TTL_MS` | `300000` (5 min) | Retry window kept after a file reaches a device |
| `PROCESSING_TIMEOUT_MS` | `600000` (10 min) | Max idle time during an ffmpeg merge before retry |
| `MAX_CONCURRENT_JOBS` | `3` | Parallel yt-dlp/ffmpeg jobs |
| `RATE_LIMIT_INFO_PER_MIN` | `30` | Metadata requests per minute per IP |
| `RATE_LIMIT_DOWNLOAD_PER_MIN` | `10` | Download requests per minute per IP |

Binary resolution order: `YTDLP_PATH`/`FFMPEG_PATH` → `./bin` → system PATH.

---

## API reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | `GET` | Liveness probe (`{ status, uptime }`) |
| `/api/capabilities` | `GET` | Reports yt-dlp/ffmpeg availability |
| `/api/info` | `POST` | Video metadata + available formats |
| `/api/download` | `POST` | Start a download job |
| `/api/jobs/:id` | `GET` | Job status + progress |
| `/api/jobs/:id` | `DELETE` | Cancel the job and delete its files |
| `/api/jobs/:id/file` | `HEAD` | Preflight: is the finished file ready? |
| `/api/jobs/:id/file` | `GET` | Stream the file to the device (supports `Range`) |

---

## NPM scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run setup:binaries` | Download yt-dlp into `./bin` (`-- --force` to refresh, `-- --with-ffmpeg` for static Linux ffmpeg) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript validation |
| `npm run format` | Prettier formatting |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Sign in to confirm you’re not a bot" | YouTube flagged the IP address (frequent on cloud hosts). Export YouTube cookies to `cookies.txt` in the root, or paste the text into the `YOUTUBE_COOKIES` environment variable in Render. |
| "Downloads are disabled until yt-dlp and ffmpeg are available" | Run `npm run setup:binaries`; ensure ffmpeg is installed or set `FFMPEG_PATH` |
| Download fails right after a YouTube change | Redeploy — the build pulls the latest yt-dlp |
| `429 Too Many Requests` | Rate limit or concurrency cap hit — wait and retry, or raise `RATE_LIMIT_*` / `MAX_CONCURRENT_JOBS` |
| "The file was already delivered and removed from the server" | Expected — run the download again if you need another copy |
| "Job not found" | Server restarted or the job expired; start the download again |
| 4K downloads feel slow | Use 1080p, or move to a larger Render plan |

---

## Project structure

```
app/                        Next.js App Router
  api/                      info, download, jobs, capabilities, health
  page.tsx                  Main page (server component)
components/downloader/      URL form, format picker, queue, notices
components/ui/              shadcn/ui primitives
lib/                        yt-dlp runner, job store, capabilities, rate limiting
scripts/setup-binaries.mjs  yt-dlp/ffmpeg provisioning
render.yaml                 Render Blueprint
```

---

## License

Free to use and modify for personal setups. You are responsible for complying with platform terms and copyright law when using this software.
