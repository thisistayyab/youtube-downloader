"use client"

import { Download, Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { AdvancedOptions } from "@/components/downloader/advanced-options"
import { DownloadOptionsPanel } from "@/components/downloader/download-options-panel"
import { DownloadQueue } from "@/components/downloader/download-queue"
import { DownloaderHeader } from "@/components/downloader/header"
import { FormatSelector } from "@/components/downloader/format-selector"
import { LegalNotice } from "@/components/downloader/legal-notice"
import {
  ToolSetupBanner,
  useToolSetupToasts,
} from "@/components/downloader/tool-setup-notice"
import { UrlForm } from "@/components/downloader/url-form"
import { VideoPreview } from "@/components/downloader/video-preview"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AppCapabilities } from "@/lib/capabilities"
import type {
  DownloadJob,
  DownloadOptions,
  DownloadProgressEvent,
  FormatCategory,
  StartDownloadResponse,
  YtdlpVideoInfo,
} from "@/lib/ytdlp-types"
import {
  DEFAULT_FORMAT,
  DEFAULT_OUTPUT_TEMPLATE,
  decodeYoutubeTitle,
  getDefaultPresetForVideo,
  PRESET_FORMATS,
} from "@/lib/ytdlp-utils"

const QUEUE_STORAGE_KEY = "ytdlp_download_queue"

type FormatPreset = (typeof PRESET_FORMATS)[number]

function applyPresetOptions(
  prev: DownloadOptions,
  preset: FormatPreset
): DownloadOptions {
  return {
    ...prev,
    format: preset.value,
    ...("mergeOutputFormat" in preset && preset.mergeOutputFormat
      ? { mergeOutputFormat: preset.mergeOutputFormat }
      : {}),
  }
}

const DEFAULT_OPTIONS: DownloadOptions = {
  format: DEFAULT_FORMAT,
  outputTemplate: DEFAULT_OUTPUT_TEMPLATE,
  embedThumbnail: false,
  embedMetadata: false,
  embedSubs: false,
  writeSubs: false,
  writeAutoSubs: false,
  subLangs: "en.*,es",
  audioOnly: false,
  mergeOutputFormat: "mp4",
  extraArgs: "",
  convertOpusToAac: false,
  preserveUploadDate: true,
}

const TERMINAL_STATUSES = new Set<DownloadJob["status"]>([
  "completed",
  "error",
  "cancelled",
])

function mapProgressToJob(
  job: DownloadJob,
  event: DownloadProgressEvent
): DownloadJob {
  return {
    ...job,
    status: event.status,
    progress: event.progress,
    speed: event.speed,
    eta: event.eta,
    filePath: event.filePath,
    fileReady: event.fileReady,
    processingPhase: event.processingPhase,
    error: event.error,
  }
}

/**
 * Triggers native browser download without loading the file into memory.
 */
async function saveJobFile(job: DownloadJob): Promise<string | null> {
  const fileUrl = `/api/jobs/${job.id}/file`

  try {
    const headRes = await fetch(fileUrl, { method: "HEAD" })
    if (!headRes.ok) {
      const data = (await headRes.json().catch(() => null)) as {
        error?: string
      } | null
      return data?.error ?? "File is not ready on the server."
    }
  } catch {
    // Non-fatal if HEAD preflight is blocked, still try downloading
  }

  const anchor = document.createElement("a")
  anchor.href = fileUrl
  anchor.download = job.filePath ?? ""
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  setTimeout(() => anchor.remove(), 1000)
  return null
}

export function DownloaderApp({
  capabilities,
}: {
  capabilities: AppCapabilities
}) {
  useToolSetupToasts(capabilities)

  const toolsReady =
    capabilities.ytdlp.available && capabilities.ffmpeg.available

  const [url, setUrl] = useState("")
  const [videoInfo, setVideoInfo] = useState<YtdlpVideoInfo | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formatCategory, setFormatCategory] = useState<FormatCategory>("video")
  const [options, setOptions] = useState<DownloadOptions>(DEFAULT_OPTIONS)
  const [isStartingDownload, setIsStartingDownload] = useState(false)
  const [jobs, setJobs] = useState<DownloadJob[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (raw) {
        const stored = JSON.parse(raw) as DownloadJob[]
        if (Array.isArray(stored)) return stored
      }
    } catch {
      // Ignore localStorage errors
    }
    return []
  })

  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  )

  // Persist queue updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(jobs))
    } catch {
      // Ignore localStorage errors
    }
  }, [jobs])

  const stopPolling = useCallback((jobId: string) => {
    const timer = pollTimers.current.get(jobId)
    if (timer) {
      clearInterval(timer)
      pollTimers.current.delete(jobId)
    }
  }, [])

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling(jobId)

      const check = async () => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" })
          if (!res.ok) {
            if (res.status === 404) {
              stopPolling(jobId)
            }
            return
          }

          const event = (await res.json()) as DownloadProgressEvent

          setJobs((prev) =>
            prev.map((j) => {
              if (j.id !== jobId) return j

              const updated = mapProgressToJob(j, event)

              // When finished and file is ready, trigger automatic save to user's device
              if (
                updated.status === "completed" &&
                updated.fileReady &&
                !updated.autoSaved
              ) {
                updated.autoSaved = true
                void saveJobFile(updated).then((err) => {
                  if (err) {
                    toast.error("Could not save file", { description: err })
                  } else {
                    toast.success("Download ready!", {
                      description:
                        "The file is now saving to your device Downloads folder.",
                    })
                  }
                })
              }

              return updated
            })
          )

          if (TERMINAL_STATUSES.has(event.status)) {
            stopPolling(jobId)
            if (event.status === "error") {
              toast.error("Download failed", {
                description:
                  event.error ?? "An error occurred during download.",
              })
            }
          }
        } catch {
          // Keep polling on temporary network hiccup
        }
      }

      void check()
      const timer = setInterval(check, 1000)
      pollTimers.current.set(jobId, timer)
    },
    [stopPolling]
  )

  // Resume polling for any in-flight jobs on page load
  useEffect(() => {
    for (const job of jobs) {
      if (!TERMINAL_STATUSES.has(job.status)) {
        pollJob(job.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = pollTimers.current
    return () => {
      for (const timer of timers.values()) {
        clearInterval(timer)
      }
      timers.clear()
    }
  }, [])

  const handleFetch = useCallback(async (inputUrl: string) => {
    setIsFetching(true)
    setFetchError(null)
    setUrl(inputUrl)

    try {
      const response = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch video info")
      }

      const info = data as YtdlpVideoInfo
      const defaultPreset = getDefaultPresetForVideo(info)
      setVideoInfo(info)
      setFormatCategory("custom")
      setOptions((previous) => ({
        ...applyPresetOptions(previous, defaultPreset),
        audioOnly: false,
      }))
    } catch (error) {
      setVideoInfo(null)
      const message =
        error instanceof Error ? error.message : "Something went wrong"
      setFetchError(message)

      if (/yt-dlp|ffmpeg/i.test(message)) {
        toast.error("Server tools unavailable", { description: message })
      }
    } finally {
      setIsFetching(false)
    }
  }, [])

  const handleCategoryChange = useCallback((category: FormatCategory) => {
    setFormatCategory(category)
    setOptions((previous) => ({
      ...previous,
      audioOnly: category === "audio",
      mergeOutputFormat:
        category === "video" || category === "audio"
          ? "mp4"
          : previous.mergeOutputFormat,
    }))
  }, [])

  const handleDownload = useCallback(async () => {
    if (!videoInfo || isStartingDownload) return

    setIsStartingDownload(true)

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          videoInfo: {
            id: videoInfo.id,
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            webpage_url: videoInfo.webpage_url,
            upload_date: videoInfo.upload_date,
          },
          options,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? "Download failed to start")
      }

      const { jobId } = data as StartDownloadResponse

      const job: DownloadJob = {
        id: jobId,
        url,
        title: decodeYoutubeTitle(videoInfo.title),
        thumbnail: videoInfo.thumbnail,
        status: "queued",
        progress: 0,
        options: { ...options },
        createdAt: Date.now(),
      }

      setJobs((prev) => [job, ...prev])
      toast.info("Download queued", {
        description: "Your download has started on the server.",
      })
      pollJob(jobId)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start download"
      toast.error("Download error", { description: message })
    } finally {
      setIsStartingDownload(false)
    }
  }, [isStartingDownload, options, pollJob, url, videoInfo])

  const handleRemoveJob = useCallback(
    (jobId: string) => {
      stopPolling(jobId)
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
      void fetch(`/api/jobs/${jobId}`, { method: "DELETE" }).catch(() => null)
    },
    [stopPolling]
  )

  return (
    <div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
      <DownloaderHeader />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-3 text-center sm:text-left">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Download YouTube videos
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Paste a link, choose a format, and download. Video and audio are
            processed on the server with yt-dlp &amp; ffmpeg and handed straight
            to your browser&apos;s download manager.
          </p>
          <LegalNotice />
          <ToolSetupBanner capabilities={capabilities} />
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video URL</CardTitle>
                <CardDescription>
                  Fetch metadata and available formats with yt-dlp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UrlForm
                  onFetch={handleFetch}
                  isLoading={isFetching}
                  error={fetchError}
                  disabled={!toolsReady}
                />
              </CardContent>
            </Card>

            {videoInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Download settings</CardTitle>
                  <CardDescription>
                    Configure format presets, audio extraction, and metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormatSelector
                    info={videoInfo}
                    category={formatCategory}
                    onCategoryChange={handleCategoryChange}
                    format={options.format}
                    onFormatChange={(format) =>
                      setOptions((previous) => ({ ...previous, format }))
                    }
                    onPresetApply={(preset) =>
                      setOptions((previous) =>
                        applyPresetOptions(previous, preset)
                      )
                    }
                  />

                  <Separator />

                  <DownloadOptionsPanel
                    options={options}
                    onChange={setOptions}
                  />

                  <AdvancedOptions options={options} onChange={setOptions} />

                  <Button
                    size="lg"
                    className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    disabled={isStartingDownload}
                    onClick={handleDownload}
                  >
                    {isStartingDownload ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Starting download…
                      </>
                    ) : (
                      <>
                        <Download />
                        Download with yt-dlp
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6 lg:col-span-2">
            <VideoPreview info={videoInfo} isLoading={isFetching} />
            <DownloadQueue
              jobs={jobs}
              onSaveFile={saveJobFile}
              onRemove={handleRemoveJob}
              onClearCompleted={() =>
                setJobs((prev) => prev.filter((j) => j.status !== "completed"))
              }
            />
          </div>
        </div>
      </main>
    </div>
  )
}
