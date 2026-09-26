"use client"

import { FolderOpen } from "lucide-react"
import { useId } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { DownloadOptions } from "@/lib/ytdlp-types"
import { DEFAULT_OUTPUT_TEMPLATE } from "@/lib/ytdlp-utils"

interface DownloadOptionsPanelProps {
  options: DownloadOptions
  onChange: (options: DownloadOptions) => void
}

export function DownloadOptionsPanel({
  options,
  onChange,
}: DownloadOptionsPanelProps) {
  const baseId = useId()

  function patch(partial: Partial<DownloadOptions>) {
    onChange({ ...options, ...partial })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor={`${baseId}-output`}
          className="flex items-center gap-1.5"
        >
          <FolderOpen className="size-3.5" />
          Output template
        </Label>
        <Input
          id={`${baseId}-output`}
          value={options.outputTemplate}
          onChange={(e) => patch({ outputTemplate: e.target.value })}
          placeholder={DEFAULT_OUTPUT_TEMPLATE}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Saved as the YouTube title (invalid characters like{" "}
          <code className="font-mono">:</code> are removed for Windows). Display
          template: <code className="font-mono">{DEFAULT_OUTPUT_TEMPLATE}</code>
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium">Post-processing</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionRow
            id={`${baseId}-embed-thumb`}
            label="Embed thumbnail"
            hint="--embed-thumbnail"
            checked={options.embedThumbnail}
            onCheckedChange={(v) => patch({ embedThumbnail: v === true })}
          />
          <OptionRow
            id={`${baseId}-embed-meta`}
            label="Embed metadata"
            hint="Slow on 4K — off by default; use Preserve upload date instead"
            checked={options.embedMetadata}
            onCheckedChange={(v) => patch({ embedMetadata: v === true })}
          />
          <OptionRow
            id={`${baseId}-convert-opus`}
            label="Convert Opus → AAC if needed"
            hint="MP4 merges already use AAC; enable if you still see Opus"
            checked={options.convertOpusToAac}
            onCheckedChange={(v) => patch({ convertOpusToAac: v === true })}
          />
          <OptionRow
            id={`${baseId}-preserve-date`}
            label="Preserve upload date"
            hint="File date = YouTube upload date"
            checked={options.preserveUploadDate}
            onCheckedChange={(v) => patch({ preserveUploadDate: v === true })}
          />
          <OptionRow
            id={`${baseId}-write-subs`}
            label="Download subtitles"
            hint="--write-subs"
            checked={options.writeSubs}
            onCheckedChange={(v) => patch({ writeSubs: v === true })}
          />
          <OptionRow
            id={`${baseId}-auto-subs`}
            label="Auto-generated subs"
            hint="--write-auto-subs"
            checked={options.writeAutoSubs}
            onCheckedChange={(v) => patch({ writeAutoSubs: v === true })}
          />
          <OptionRow
            id={`${baseId}-embed-subs`}
            label="Embed subtitles"
            hint="--embed-subs"
            checked={options.embedSubs}
            onCheckedChange={(v) => patch({ embedSubs: v === true })}
          />
        </div>
      </div>

      {(options.writeSubs || options.writeAutoSubs) && (
        <div className="space-y-2">
          <Label htmlFor={`${baseId}-sub-langs`}>Subtitle languages</Label>
          <Input
            id={`${baseId}-sub-langs`}
            value={options.subLangs}
            onChange={(e) => patch({ subLangs: e.target.value })}
            placeholder="en.*,es"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            yt-dlp <code className="font-mono">--sub-langs</code>
          </p>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label>Merge output format</Label>
        <Select
          value={options.mergeOutputFormat}
          onValueChange={(v) =>
            patch({
              mergeOutputFormat: v as DownloadOptions["mergeOutputFormat"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4</SelectItem>
            <SelectItem value="mkv">MKV</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function OptionRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <div className="grid gap-0.5 leading-none">
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {label}
        </Label>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {hint}
        </span>
      </div>
    </div>
  )
}
