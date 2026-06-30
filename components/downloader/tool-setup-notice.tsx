"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import type { AppCapabilities } from "@/lib/capabilities"

export function useToolSetupToasts(capabilities: AppCapabilities | null) {
  const shownRef = useRef(false)

  useEffect(() => {
    if (!capabilities || capabilities.hostedMode || shownRef.current) return

    shownRef.current = true

    if (!capabilities.ytdlp.available) {
      toast.error("yt-dlp is not set up", {
        description:
          capabilities.ytdlp.error ??
          "Install yt-dlp and add it to PATH, or set YTDLP_PATH in .env.local.",
        duration: 12_000,
        action: {
          label: "PC Setup",
          onClick: () => {
            window.location.href = "/setup"
          },
        },
      })
    }

    if (!capabilities.ffmpeg.available) {
      toast.error("ffmpeg is not set up", {
        description:
          capabilities.ffmpeg.error ??
          "Install ffmpeg and add it to PATH, or set FFMPEG_PATH in .env.local.",
        duration: 12_000,
        action: {
          label: "PC Setup",
          onClick: () => {
            window.location.href = "/setup"
          },
        },
      })
    }
  }, [capabilities])
}

export function ToolSetupBanner({
  capabilities,
}: {
  capabilities: AppCapabilities | null
}) {
  if (!capabilities || capabilities.hostedMode) return null
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
        {missing.join(" and ")} not detected on this PC
      </p>
      <p className="mt-1 text-muted-foreground">
        Downloads will not work until you install the required tools.{" "}
        <Link
          href="/setup"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Open the PC setup guide
        </Link>
      </p>
    </div>
  )
}
