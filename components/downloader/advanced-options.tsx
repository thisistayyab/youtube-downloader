"use client"

import { ChevronDown, Terminal } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { DownloadOptions } from "@/lib/ytdlp-types"

interface AdvancedOptionsProps {
  options: DownloadOptions
  onChange: (options: DownloadOptions) => void
}

export function AdvancedOptions({ options, onChange }: AdvancedOptionsProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-muted/50">
        <span className="flex items-center gap-2">
          <Terminal className="size-4 text-muted-foreground" />
          Advanced yt-dlp arguments
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="space-y-2">
          <Label htmlFor="extra-args">Extra CLI arguments</Label>
          <Textarea
            id="extra-args"
            value={options.extraArgs}
            onChange={(e) =>
              onChange({ ...options, extraArgs: e.target.value })
            }
            placeholder="--cookies-from-browser chrome --geo-bypass"
            className="min-h-20 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Passed directly to yt-dlp after built-in flags. One argument per
            line or space-separated.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
