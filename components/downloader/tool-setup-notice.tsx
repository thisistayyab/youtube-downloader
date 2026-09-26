"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

import type { AppCapabilities } from "@/lib/capabilities"

export function useToolSetupToasts(capabilities: AppCapabilities) {
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true

    if (!capabilities.ytdlp.available) {
      toast.error("yt-dlp is not available", {
        description:
          capabilities.ytdlp.error ??
          "Install yt-dlp on the server and add it to PATH, or set YTDLP_PATH.",
        duration: 12_000,
      })
    }

    if (!capabilities.ffmpeg.available) {
      toast.error("ffmpeg is not available", {
        description:
          capabilities.ffmpeg.error ??
          "Install ffmpeg on the server and add it to PATH, or set FFMPEG_PATH.",
        duration: 12_000,
      })
    }
  }, [capabilities])
}

export function ToolSetupBanner({
  capabilities,
}: {
  capabilities: AppCapabilities
}) {
  if (capabilities.ytdlp.available && capabilities.ffmpeg.available) return null

  const missing = [
    !capabilities.ytdlp.available ? "yt-dlp" : null,
    !capabilities.ffmpeg.available ? "ffmpeg" : null,
  ].filter(Boolean)

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-foreground">
        {missing.join(" and ")} not detected on this server
      </p>
      <p className="mt-1 text-muted-foreground">
        Downloads are disabled until the missing tools are available on the
        host. See the deployment notes in the README.
      </p>
    </div>
  )
}
