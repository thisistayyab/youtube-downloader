import { DownloaderHeader } from "@/components/downloader/header"
import { SetupGuide } from "@/components/downloader/setup-guide"

export const metadata = {
  title: "PC Setup Guide — YouTube Downloader",
  description:
    "Install Node.js, yt-dlp, and ffmpeg on your computer to download YouTube videos locally and legally.",
}

export default function SetupPage() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
      <DownloaderHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <SetupGuide />
      </main>
    </div>
  )
}
