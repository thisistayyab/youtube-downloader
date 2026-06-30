import { Clock, Eye, User } from "lucide-react"
import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { YtdlpVideoInfo } from "@/lib/ytdlp-types"
import {
  formatDuration,
  formatUploadDate,
  formatViewCount,
} from "@/lib/ytdlp-utils"

interface VideoPreviewProps {
  info: YtdlpVideoInfo | null
  isLoading: boolean
}

export function VideoPreview({ info, isLoading }: VideoPreviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!info) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <Eye className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No video loaded</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Paste a YouTube link above and click Get info to preview formats
            before downloading.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="line-clamp-2 text-base leading-snug">
          {info.title}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <User className="size-3.5 shrink-0" />
          <span className="truncate">{info.uploader}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
          <Image
            src={info.thumbnail}
            alt={info.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized
          />
          <Badge
            variant="secondary"
            className="absolute right-2 bottom-2 bg-black/70 text-white backdrop-blur-sm"
          >
            <Clock className="size-3" />
            {formatDuration(info.duration)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Eye className="size-3" />
            {formatViewCount(info.view_count)}
          </Badge>
          <Badge variant="outline">{formatUploadDate(info.upload_date)}</Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {info.id}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
