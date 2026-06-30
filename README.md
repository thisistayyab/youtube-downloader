# YouTube Downloader

A **local, personal** web app for saving YouTube videos and playlists to **your own computer**. Everything runs on your PC — nothing is uploaded to a cloud service, and there is no tracking or analytics built in.

This guide walks you through installing every required tool on your machine, running the app, and using it **legally and responsibly**.

---

## Legal and personal use

This software is intended for **personal, local use on your own computer**.

You may use it when:

- You **own** the content (e.g. your own YouTube uploads, backups of your channel).
- The copyright holder has **given you permission** to download (written license, Creative Commons, explicit allowance).
- Your use falls under an applicable **legal exception** in your country (e.g. some jurisdictions allow limited personal copies — check your local law).

You should **not** use it to:

- Download copyrighted videos you do not have rights to.
- Redistribute, sell, or publicly share downloaded content without permission.
- Circumvent YouTube or other platform rules for commercial piracy.

Also respect:

- [YouTube Terms of Service](https://www.youtube.com/t/terms)
- Copyright law in your country

**Privacy on your PC:** URLs and files are processed only on your machine. Completed downloads are stored temporarily in a local folder and removed automatically after a set time. No third-party analytics or ad trackers are included in this app.

---

## What gets installed on your PC

| Software | What it does | Required? |
|----------|--------------|-----------|
| **Node.js** | Runs the web app on your computer | Yes |
| **yt-dlp** | Reads YouTube URLs and downloads video/audio | Yes |
| **ffmpeg** | Combines video + audio and embeds thumbnails | Yes |
| **Git** | Downloads this project from a repository | Only if you clone with Git |

Recommended: **Windows Terminal** or **PowerShell** (already on Windows 10/11).

---

## Complete setup on Windows (step by step)

Follow these steps in order. Allow **15–30 minutes** the first time.

### Step 1 — Install Node.js

Node.js runs the downloader app on your PC.

1. Open [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS** version (recommended for most users).
3. Run the installer (`node-v…-x64.msi`).
4. On the setup screens, leave defaults checked, especially **“Add to PATH”**.
5. Finish the installer.

**Verify** — open **PowerShell** (Start menu → type `PowerShell` → Enter) and run:

```powershell
node --version
npm --version
```

Expected output (versions may differ):

```
v22.x.x
10.x.x
```

You need **Node.js 20 or newer**. If `node` is not recognized, restart your PC and try again.

---

### Step 2 — Install yt-dlp

`yt-dlp` is the engine that fetches video information and downloads files.

#### Option A — winget (easiest)

In PowerShell:

```powershell
winget install yt-dlp.yt-dlp
```

Close PowerShell, open a **new** window, then verify:

```powershell
yt-dlp --version
```

You should see a version string (e.g. `2025.12.08`).

#### Option B — manual install

Use this if winget is unavailable.

1. Create a folder: `C:\tools`
2. Download **yt-dlp.exe** from the [latest release](https://github.com/yt-dlp/yt-dlp/releases/latest).
3. Move `yt-dlp.exe` into `C:\tools\`.
4. Either add `C:\tools` to PATH (see [Adding a folder to PATH](#adding-a-folder-to-path-windows)) **or** skip PATH and set `YTDLP_PATH` later in `.env.local`.

Verify:

```powershell
C:\tools\yt-dlp.exe --version
```

---

### Step 3 — Install ffmpeg

`ffmpeg` merges separate video and audio streams (common for 1080p/4K) and embeds thumbnails.

#### Option A — winget (easiest)

```powershell
winget install Gyan.FFmpeg
```

Close and reopen PowerShell, then verify:

```powershell
ffmpeg -version
```

The first lines should mention `ffmpeg version …`.

#### Option B — manual install

1. Open [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
2. Under **release builds**, download **ffmpeg-release-essentials.zip** (not the full build unless you need extra codecs).
3. Extract the zip (right-click → **Extract All…**) to `C:\ffmpeg`.
4. Inside you will have a path like:
   ```
   C:\ffmpeg\ffmpeg-7.1-essentials_build\bin\ffmpeg.exe
   ```
5. Either add that `bin` folder to PATH **or** set `FFMPEG_PATH` in `.env.local` (see Step 6).

Verify (adjust the path if yours differs):

```powershell
C:\ffmpeg\ffmpeg-7.1-essentials_build\bin\ffmpeg.exe -version
```

---

### Step 4 — Get the project on your PC

#### If you have Git

```powershell
cd $HOME\Documents
git clone https://github.com/thisistayyab/youtube-downloader.git youtube-downloader
cd youtube-downloader
```

#### If you do not have Git

1. Download the project as a **ZIP** from your repository host.
2. Extract it to a folder such as `C:\Users\YourName\Documents\youtube-downloader`.
3. In PowerShell:

```powershell
cd C:\Users\YourName\Documents\youtube-downloader
```

---

### Step 5 — Install app dependencies

In the project folder:

```powershell
npm install
```

This downloads the JavaScript libraries the UI needs. It may take a few minutes.

---

### Step 6 — Configure paths (only if needed)

If **both** `yt-dlp --version` and `ffmpeg -version` work in PowerShell, you can skip this step.

Otherwise, create a local config file:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Edit and save (use your real paths):

```env
YTDLP_PATH=C:\tools\yt-dlp.exe
FFMPEG_PATH=C:\ffmpeg\ffmpeg-7.1-essentials_build\bin
DOWNLOAD_DIR=./downloads
```

| Variable | When to set it |
|----------|----------------|
| `YTDLP_PATH` | `yt-dlp` is not found in PowerShell |
| `FFMPEG_PATH` | `ffmpeg` is not found in PowerShell |
| `DOWNLOAD_DIR` | Optional — where temp files are stored (default: `downloads` folder in the project) |

---

### Step 7 — Start the app

```powershell
npm run dev
```

When you see something like:

```
▲ Next.js …
- Local: http://localhost:3000
```

1. Open your browser (Chrome, Edge, Firefox).
2. Go to **http://localhost:3000**
3. Keep the PowerShell window **open** while you use the app — closing it stops the server.

To stop the app later: press `Ctrl + C` in that PowerShell window.

---

### Step 8 — Download a video (first use)

1. Copy a YouTube video URL (e.g. `https://www.youtube.com/watch?v=…`).
2. Paste it into the app and click to fetch info.
3. Choose a format (e.g. **1080p MP4** for most cases).
4. Click **Download**.
5. When the job completes, use the **Save file** action in the queue — the file goes to your browser’s default **Downloads** folder.

**Where files live on disk:** While downloading, files are stored under the project’s `downloads` folder (or `DOWNLOAD_DIR`). They are **automatically deleted** from that folder after about **1 hour** by default, after you have saved them through the browser.

---

### Adding a folder to PATH (Windows)

Only needed if you installed yt-dlp or ffmpeg manually and did not use winget.

1. Press `Win + S`, search **“environment variables”**, open **Edit the system environment variables**.
2. Click **Environment Variables…**
3. Under **User variables**, select **Path** → **Edit…**
4. Click **New** and add your folder (e.g. `C:\tools` or `C:\ffmpeg\…\bin`).
5. Click **OK** on all dialogs.
6. **Close and reopen** PowerShell (and Cursor/VS Code if open).
7. Run `yt-dlp --version` and `ffmpeg -version` again.

---

## Setup on macOS

Install [Homebrew](https://brew.sh/) if you do not have it, then:

```bash
brew install node@20 yt-dlp ffmpeg
```

Verify:

```bash
node --version    # should be v20+
yt-dlp --version
ffmpeg -version
```

Get and run the project:

```bash
git clone https://github.com/thisistayyab/youtube-downloader.git
cd youtube-downloader
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Setup on Linux (Debian / Ubuntu)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# ffmpeg
sudo apt-get update
sudo apt-get install -y ffmpeg
```

Verify, then clone and run:

```bash
node --version && yt-dlp --version && ffmpeg -version

git clone https://github.com/thisistayyab/youtube-downloader.git
cd youtube-downloader
npm install
npm run dev
```

---

## Environment variables (reference)

Create `.env.local` in the project root. This file stays on your PC and is not committed to Git.

| Variable | Default | Description |
|----------|---------|-------------|
| `YTDLP_PATH` | `yt-dlp.exe` / `yt-dlp` on PATH | Full path if not on PATH |
| `FFMPEG_PATH` | `ffmpeg` on PATH | Path to `ffmpeg.exe` or its `bin` folder |
| `DOWNLOAD_DIR` | `./downloads` | Local temp storage for jobs |
| `JOB_TTL_MS` | `3600000` (1 hour) | Auto-delete jobs/files after this many milliseconds |
| `PROCESSING_TIMEOUT_MS` | `600000` (10 min) | Max wait during video merge before retry |

---

## How it works on your PC

```
Browser (localhost:3000)
        ↓
Next.js app (Node.js on your PC)
        ↓
yt-dlp  →  downloads streams from YouTube
        ↓
ffmpeg  →  merges video + audio (when needed)
        ↓
Local downloads/ folder  →  you save via browser  →  auto-deleted later
```

- No cloud upload of your URLs or files by this app.
- No built-in analytics or advertising.
- Restarting the app (`Ctrl+C` then `npm run dev`) clears in-progress jobs — download again if needed.

---

## Running without the dev server (optional)

For everyday use after setup, you can build once and start faster:

```powershell
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000) as before.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `'node' is not recognized` | Reinstall Node.js with “Add to PATH”, restart PC |
| `yt-dlp not found` in the app | Run `yt-dlp --version` in the **same** PowerShell window as `npm run dev`; set `YTDLP_PATH` in `.env.local` |
| `ffmpeg not found` | Install essentials build; set `FFMPEG_PATH` to the `bin` folder |
| App works in PowerShell but not in Cursor | Restart Cursor after PATH changes |
| Download stuck on “processing” | Try **1080p MP4** instead of 4K; ensure ffmpeg is installed |
| “Job not found” | Server was restarted — start the download again |
| Browser cannot open localhost:3000 | Check PowerShell still shows the app running; try `http://127.0.0.1:3000` |
| Permission errors on Windows | Run PowerShell as your normal user; avoid `Program Files` for `DOWNLOAD_DIR` |

**Update yt-dlp regularly** (YouTube changes often):

```powershell
# winget
winget upgrade yt-dlp.yt-dlp

# or manual — replace yt-dlp.exe with the latest from GitHub releases
```

---

## Keeping everything legal and private

| Topic | How this app behaves |
|-------|----------------------|
| **Legal use** | Tool only — you choose what to download; follow copyright and YouTube ToS |
| **Privacy** | Processing stays on your PC; no third-party analytics |
| **Storage** | Temp files auto-delete; use your browser to save to your own Downloads folder |
| **Sharing** | Do not expose `npm run dev` to the public internet without access control — this is meant for **your machine** |

---

## Deploy to Vercel

The live website runs on [Vercel](https://vercel.com). Downloads still run on **your Windows PC** via the local agent — Vercel only hosts the UI and setup guide.

### 1. Push to GitHub

Repository: [https://github.com/thisistayyab/youtube-downloader](https://github.com/thisistayyab/youtube-downloader)

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin master
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import **thisistayyab/youtube-downloader**
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `./` (default)
5. Build command: `npm run build` (from `vercel.json`)
6. Click **Deploy**

No `yt-dlp` or `ffmpeg` is needed on Vercel — the build is frontend + lightweight API routes only.

### 3. Environment variables (Vercel Dashboard)

Open **Project → Settings → Environment Variables**. Add for **Production**, **Preview**, and **Development**:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_LOCAL_AGENT_PORTS` | `3000` |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/thisistayyab/youtube-downloader` |
| `NEXT_PUBLIC_REPO_CLONE_URL` | `https://github.com/thisistayyab/youtube-downloader.git` |

See [`.env.vercel.example`](.env.vercel.example) for reference.

### 4. Connect your Windows PC after deploy

1. Clone the repo on your PC and install Node.js, yt-dlp, ffmpeg (see setup guide on the live site).
2. In `.env.local` on your PC:

```env
VERCEL_SITE_URL=https://your-project.vercel.app
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://your-project.vercel.app
```

3. Run the local agent:

```powershell
npm run agent
```

4. Open your **Vercel URL** (not localhost) and click **Auto-connect to this PC**.

### Files included for Vercel

| File | Purpose |
|------|---------|
| [`vercel.json`](vercel.json) | Build settings, security headers, API function limits |
| [`.vercelignore`](.vercelignore) | Excludes local-only files from upload |
| [`.env.vercel.example`](.env.vercel.example) | Environment variables checklist |

### What works on Vercel vs your PC

| Feature | Vercel | Your PC (agent) |
|---------|--------|-----------------|
| Website UI | Yes | Yes (localhost) |
| PC setup guide | Yes | Yes |
| Auto-connect to local agent | Yes | N/A |
| yt-dlp downloads | No | Yes |

---

## Other cloud hosting

For a full server (not serverless) with downloads in the cloud, use a VPS with Node.js, yt-dlp, and ffmpeg — not Vercel.

---

## NPM scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start for daily use (recommended while setting up) |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run agent` | Start local agent for Vercel site (Windows) |
| `npm run lint` | Check code style |
| `npm run typecheck` | TypeScript validation |

---

## Quick checklist

Before your first download, confirm:

- [ ] `node --version` shows v20+
- [ ] `yt-dlp --version` works
- [ ] `ffmpeg -version` works
- [ ] `npm install` completed in the project folder
- [ ] `npm run dev` is running and http://localhost:3000 opens
- [ ] You only download content you have the right to save

---

## License

Free to use and modify for personal, local setups. You are responsible for complying with platform terms and copyright law when using this software.
