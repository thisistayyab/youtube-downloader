"use client"

import { Download, Loader2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { AdvancedOptions } from "@/components/downloader/advanced-options"
import { DownloadOptionsPanel } from "@/components/downloader/download-options-panel"
import { DownloadQueue } from "@/components/downloader/download-queue"
import { DownloaderHeader } from "@/components/downloader/header"
import { FormatSelector } from "@/components/downloader/format-selector"
import { LegalNotice } from "@/components/downloader/legal-notice"
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
import type {
  DownloadJob,
  DownloadOptions,
  DownloadProgressEvent,
  FormatCategory,
  YtdlpVideoInfo,
} from "@/lib/ytdlp-types"
import {
  DEFAULT_FORMAT,
  DEFAULT_OUTPUT_TEMPLATE,
  decodeYoutubeTitle,
  getDefaultPresetForVideo,
  PRESET_FORMATS,
  sanitizeWindowsFilename,
} from "@/lib/ytdlp-utils"

function applyPresetOptions(
  prev: DownloadOptions,
  preset: (typeof PRESET_FORMATS)[number]
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
  subLangs: "en.*",
  audioOnly: false,
  mergeOutputFormat: "mp4",
  extraArgs: "",
  convertOpusToAac: true,
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

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const encoded = header.match(/filename\*=UTF-8''([^;\s]+)/i)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i)?.[1]
  if (quoted) {
    try {
      return decodeURIComponent(quoted)
    } catch {
      return quoted
    }
  }
  return null
}

async function saveJobFile(job: DownloadJob): Promise<string | null> {
  const res = await fetch(`/api/jobs/${job.id}/file`, { cache: "no-store" })

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    return data?.error ?? "File not available. Download again after the job completes."
  }

  const blob = await res.blob()
  const fileName =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ??
    job.filePath ??
    sanitizeWindowsFilename(decodeYoutubeTitle(job.title), ".mp4")

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(objectUrl)
  return null
}

export function DownloaderApp() {
  const [url, setUrl] = useState("")
  const [videoInfo, setVideoInfo] = useState<YtdlpVideoInfo | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [formatCategory, setFormatCategory] = useState<FormatCategory>("video")
  const [options, setOptions] = useState<DownloadOptions>(DEFAULT_OPTIONS)
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [isStartingDownload, setIsStartingDownload] = useState(false)
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map()
  )

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

      const timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" })
          const data = (await res.json()) as DownloadProgressEvent & {
            error?: string
          }

          if (!res.ok) {
            stopPolling(jobId)
            setJobs((prev) =>
              prev.map((job) =>
                job.id === jobId
                  ? {
                      ...job,
                      status: "error",
                      error: data.error ?? "Job not found",
                    }
                  : job
              )
            )
            return
          }

          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId ? mapProgressToJob(job, data) : job
            )
          )

          if (TERMINAL_STATUSES.has(data.status)) {
            stopPolling(jobId)
          }
        } catch {
          stopPolling(jobId)
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId
                ? {
                    ...job,
                    status: "error",
                    error: "Lost connection to server",
                  }
                : job
            )
          )
        }
      }, 800)

      pollTimers.current.set(jobId, timer)
    },
    [stopPolling]
  )

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
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to fetch video info")
      }

      const info = data as YtdlpVideoInfo
      const defaultPreset = getDefaultPresetForVideo(info)
      setVideoInfo(info)
      setFormatCategory("custom")
      setOptions((prev) => ({
        ...applyPresetOptions(prev, defaultPreset),
        audioOnly: false,
      }))
    } catch (err) {
      setVideoInfo(null)
      setFetchError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsFetching(false)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!videoInfo || isStartingDownload) return

    setIsStartingDownload(true)

    try {
      const res = await fetch("/api/download", {
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

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Download failed to start")
      }

      const { jobId } = data as { jobId: string }

      const job: DownloadJob = {
        id: jobId,
        url,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        status: "queued",
        progress: 0,
        options: { ...options },
        createdAt: Date.now(),
      }

      setJobs((prev) => [job, ...prev])
      pollJob(jobId)
    } catch (err) {
      setJobs((prev) => [
        {
          id: crypto.randomUUID(),
          url,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          status: "error",
          progress: 0,
          options: { ...options },
          createdAt: Date.now(),
          error: err instanceof Error ? err.message : "Download failed",
        },
        ...prev,
      ])
    } finally {
      setIsStartingDownload(false)
    }
  }, [videoInfo, url, options, isStartingDownload, pollJob])

  const handleRemoveJob = useCallback(
    (jobId: string) => {
      stopPolling(jobId)
      setJobs((prev) => prev.filter((job) => job.id !== jobId))
      void fetch(`/api/jobs/${jobId}`, { method: "DELETE" })
    },
    [stopPolling]
  )

  useEffect(() => {
    setOptions((prev) => ({ ...prev, audioOnly: formatCategory === "audio" }))
  }, [formatCategory])

  return (<div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
      <DownloaderHeader />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-3 text-center sm:text-left">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Download YouTube videos
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Paste a link, pick a format, and download. Default is{" "}
            <strong className="font-medium text-foreground">1080p MP4 + AAC</strong>{" "}
            (~200 MB at 1080p). For 4K SDR (~190 MB) use Custom →{" "}
            <strong className="font-medium text-foreground">4K SDR MP4 + AAC</strong>.
            4K HDR is ~380 MB.
          </p>
          <LegalNotice />
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video URL</CardTitle>
                <CardDescription>
                  Fetch metadata with yt-dlp before downloading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UrlForm
                  onFetch={handleFetch}
                  isLoading={isFetching}
                  error={fetchError}
                />
              </CardContent>
            </Card>

            {videoInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Download settings</CardTitle>
                  <CardDescription>
                    Maps directly to yt-dlp CLI flags
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormatSelector
                    info={videoInfo}
                    category={formatCategory}
                    onCategoryChange={setFormatCategory}
                    format={options.format}
                    onFormatChange={(format) =>
                      setOptions((prev) => ({ ...prev, format }))
                    }
                    onPresetApply={(preset) =>
                      setOptions((prev) => applyPresetOptions(prev, preset))
                    }
                  />

                  <Separator />

                  <DownloadOptionsPanel options={options} onChange={setOptions} />

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
                setJobs((prev) => prev.filter((job) => job.status !== "completed"))
              }
            />
          </div>
        </div>
      </main>
    </div>
  )
}


