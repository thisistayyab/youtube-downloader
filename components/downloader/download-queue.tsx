"use client"

import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DownloadJob, DownloadStatus } from "@/lib/ytdlp-types"

interface DownloadQueueProps {
  jobs: DownloadJob[]
  onSaveFile: (job: DownloadJob) => Promise<string | null>
  onRemove: (id: string) => void
  onClearCompleted: () => void
}

const STATUS_CONFIG: Record<
  DownloadStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  queued: { label: "Queued", variant: "secondary" },
  fetching: { label: "Fetching", variant: "secondary" },
  downloading: { label: "Downloading", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  error: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
}

export function DownloadQueue({
  jobs,
  onSaveFile,
  onRemove,
  onClearCompleted,
}: DownloadQueueProps) {
  const completedCount = jobs.filter((j) => j.status === "completed").length

  if (jobs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Download className="mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Download queue is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Started downloads will appear here with live progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Download queue</CardTitle>
          <CardDescription>
            {jobs.length} job{jobs.length !== 1 ? "s" : ""}
            {completedCount > 0 && ` · ${completedCount} completed`}
          </CardDescription>
        </div>
        {completedCount > 0 && (
          <Button variant="outline" size="sm" onClick={onClearCompleted}>
            Clear completed
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-80">
          <ul className="divide-y">
            {jobs.map((job) => (
              <QueueItem
                key={job.id}
                job={job}
                onSaveFile={onSaveFile}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function QueueItem({
  job,
  onSaveFile,
  onRemove,
}: {
  job: DownloadJob
  onSaveFile: (job: DownloadJob) => Promise<string | null>
  onRemove: (id: string) => void
}) {
  const config = STATUS_CONFIG[job.status]
  const isActive = ["fetching", "downloading", "processing"].includes(
    job.status
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setSaveError(null)
    setIsSaving(true)
    const error = await onSaveFile(job)
    if (error) setSaveError(error)
    setIsSaving(false)
  }

  return (
    <li className="flex gap-3 px-4 py-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {job.thumbnail ? (
          <Image
            src={job.thumbnail}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Download className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium">{job.title}</p>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant={config.variant} className="text-[0.65rem]">
              {isActive && <Loader2 className="size-3 animate-spin" />}
              {job.status === "completed" && (
                <CheckCircle2 className="size-3" />
              )}
              {job.status === "error" && <XCircle className="size-3" />}
              {config.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(job.id)}
              aria-label="Remove from queue"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        {isActive && (
          <div className="space-y-1">
            <Progress
              value={job.status === "processing" ? 99 : job.progress}
              className={`h-1.5 ${job.status === "processing" ? "animate-pulse" : ""}`}
            />
            <div className="flex justify-between text-[0.65rem] text-muted-foreground">
              <span className="line-clamp-1 pr-2">
                {job.status === "processing"
                  ? (job.processingPhase ?? "Processing…")
                  : `${job.progress.toFixed(0)}%`}
              </span>
              {job.status === "downloading" && (
                <span className="flex shrink-0 items-center gap-2">
                  {job.speed && <span>{job.speed}</span>}
                  {job.eta && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="size-3" />
                      {job.eta}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}

        {job.status === "completed" && (
          <div className="space-y-2">
            {job.filePath && (
              <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
                {job.filePath}
              </p>
            )}
            {job.autoSaved ? (
              <p className="text-xs text-muted-foreground">
                Saved to your device — check your browser&apos;s Downloads
                folder.
              </p>
            ) : job.fileReady === false ? (
              <p className="text-xs text-muted-foreground">
                File is no longer on the server. Run the download again to save
                it.
              </p>
            ) : (
              <Button
                size="xs"
                variant="outline"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Download />
                    Save file
                  </>
                )}
              </Button>
            )}
            {job.autoSaved && (
              <Button
                size="xs"
                variant="ghost"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : null}
                Save again
              </Button>
            )}
            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}
          </div>
        )}

        {job.status === "error" && job.error && (
          <p className="text-xs text-destructive">{job.error}</p>
        )}
      </div>
    </li>
  )
}
