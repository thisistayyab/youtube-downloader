/** Mirrors yt-dlp --dump-json / -J output shape (partial, UI-relevant fields). */
export interface YtdlpFormat {
  format_id: string
  ext: string
  resolution?: string
  format_note?: string
  fps?: number
  vcodec?: string
  acodec?: string
  filesize?: number
  filesize_approx?: number
  height?: number
  width?: number
  tbr?: number
  abr?: number
  asr?: number
  protocol?: string
}

export interface YtdlpVideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  uploader: string
  uploader_url?: string
  view_count?: number
  upload_date?: string
  description?: string
  webpage_url: string
  formats: YtdlpFormat[]
  _type?: "video" | "playlist"
  entries?: YtdlpVideoInfo[]
}

export type FormatCategory = "video" | "audio" | "custom"

export interface DownloadOptions {
  /** yt-dlp -f value, e.g. "137+140" or "bestaudio" */
  format: string
  /** yt-dlp -o output template */
  outputTemplate: string
  embedThumbnail: boolean
  embedMetadata: boolean
  embedSubs: boolean
  writeSubs: boolean
  writeAutoSubs: boolean
  subLangs: string
  audioOnly: boolean
  /** Merge to container when downloading separate streams */
  mergeOutputFormat: "mp4" | "mkv" | "webm"
  /** Extra yt-dlp CLI args passed through */
  extraArgs: string
  /** Re-encode Opus to AAC when m4a isn't available */
  convertOpusToAac: boolean
  /** Set file timestamps to YouTube upload date */
  preserveUploadDate: boolean
}

export type DownloadStatus =
  | "queued"
  | "fetching"
  | "downloading"
  | "processing"
  | "completed"
  | "error"
  | "cancelled"

export interface DownloadJob {
  id: string
  url: string
  title: string
  thumbnail?: string
  status: DownloadStatus
  progress: number
  speed?: string
  eta?: string
  filePath?: string
  fileReady?: boolean
  processingPhase?: string
  error?: string
  options: DownloadOptions
  createdAt: number
  autoSaved?: boolean
}

export interface DownloadProgressEvent {
  jobId: string
  status: DownloadStatus
  progress: number
  speed?: string
  eta?: string
  filePath?: string
  fileReady?: boolean
  processingPhase?: string
  error?: string
}

export interface FetchInfoRequest {
  url: string
}

export interface StartDownloadRequest {
  url: string
  videoInfo?: Pick<
    YtdlpVideoInfo,
    "id" | "title" | "thumbnail" | "webpage_url" | "upload_date"
  >
  options: DownloadOptions
}

export interface StartDownloadResponse {
  jobId: string
}
