"use client"

import { AlertCircle, Link2, Loader2, Search } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isValidYoutubeUrl } from "@/lib/ytdlp-utils"

interface UrlFormProps {
  onFetch: (url: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function UrlForm({ onFetch, isLoading, error }: UrlFormProps) {
  const [url, setUrl] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || isLoading) return
    await onFetch(url.trim())
  }

  const isInvalid = url.length > 0 && !isValidYoutubeUrl(url)

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="video-url" className="flex items-center gap-1.5">
          <Link2 className="size-3.5" />
          YouTube URL
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={isInvalid}
            disabled={isLoading}
            className="h-10 flex-1"
          />
          <Button
            type="submit"
            disabled={!url.trim() || isInvalid || isLoading}
            className="h-10 shrink-0 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Fetching…
              </>
            ) : (
              <>
                <Search />
                Get info
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Supports videos, Shorts, and playlists. Uses yt-dlp{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
            --dump-json
          </code>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
