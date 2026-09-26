"use client"

import { useEffect, useState } from "react"

import { DownloaderApp } from "@/components/downloader/downloader-app"
import { DownloaderHeader } from "@/components/downloader/header"
import { Skeleton } from "@/components/ui/skeleton"
import type { AppCapabilities } from "@/lib/capabilities"

const FALLBACK_CAPABILITIES: AppCapabilities = {
  downloadsAvailable: false,
  message: "Could not reach the server. Refresh the page to try again.",
  ytdlp: { available: false, error: "Server unreachable" },
  ffmpeg: { available: false, error: "Server unreachable" },
}

export function HomePage() {
  const [capabilities, setCapabilities] = useState<AppCapabilities | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/capabilities", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<AppCapabilities>
      })
      .catch(() => FALLBACK_CAPABILITIES)
      .then((caps) => {
        if (!cancelled) setCapabilities(caps)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!capabilities) {
    return (
      <div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
        <DownloaderHeader />
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    )
  }

  return <DownloaderApp capabilities={capabilities} />
}
