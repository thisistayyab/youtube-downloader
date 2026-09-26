"use client"

import { Film, Music, Settings2 } from "lucide-react"
import { useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FormatCategory, YtdlpVideoInfo } from "@/lib/ytdlp-types"
import {
  formatLabel,
  formatMaxResolutionLabel,
  getAvailablePresets,
  getBestAudioFormatId,
  getBestVideoFormatId,
  getDefaultPresetForVideo,
  getMaxVideoHeight,
  getVideoQualityPresets,
  groupFormats,
  resolveAudioSelectValue,
  resolveCustomPresetId,
  resolveVideoSelectValue,
  PRESET_FORMATS,
} from "@/lib/ytdlp-utils"

type FormatPreset = (typeof PRESET_FORMATS)[number]

interface FormatSelectorProps {
  info: YtdlpVideoInfo
  category: FormatCategory
  onCategoryChange: (category: FormatCategory) => void
  format: string
  onFormatChange: (format: string) => void
  onPresetApply: (preset: FormatPreset) => void
}

export function FormatSelector({
  info,
  category,
  onCategoryChange,
  format,
  onFormatChange,
  onPresetApply,
}: FormatSelectorProps) {
  const grouped = groupFormats(info.formats)
  const qualityPresets = getVideoQualityPresets(info)
  const availablePresets = getAvailablePresets(info)
  const maxHeight = getMaxVideoHeight(info.formats)
  const maxLabel = formatMaxResolutionLabel(maxHeight)
  const hasVideoOptions =
    qualityPresets.length > 0 ||
    grouped.combined.length > 0 ||
    grouped.videoOnly.length > 0

  const videoSelectValue = resolveVideoSelectValue(info, format)
  const audioSelectValue = resolveAudioSelectValue(info, format)
  const customPresetId = resolveCustomPresetId(info, format)

  useEffect(() => {
    if (category === "custom") {
      const match = availablePresets.find((p) => p.value === format)
      if (!match) {
        onPresetApply(getDefaultPresetForVideo(info))
      }
      return
    }

    if (
      category === "video" &&
      videoSelectValue &&
      videoSelectValue !== format
    ) {
      onFormatChange(videoSelectValue)
      return
    }

    if (
      category === "audio" &&
      audioSelectValue &&
      audioSelectValue !== format
    ) {
      onFormatChange(audioSelectValue)
    }
  }, [
    category,
    info,
    format,
    availablePresets,
    videoSelectValue,
    audioSelectValue,
    onFormatChange,
    onPresetApply,
  ])

  function handleTabChange(value: string) {
    const next = value as FormatCategory
    onCategoryChange(next)

    if (next === "video") {
      onFormatChange(getBestVideoFormatId(info))
    } else if (next === "audio") {
      onFormatChange(getBestAudioFormatId(info))
    } else {
      onPresetApply(getDefaultPresetForVideo(info))
    }
  }

  function handleCustomPresetChange(presetId: string) {
    const preset = availablePresets.find((p) => p.id === presetId)
    if (preset) onPresetApply(preset)
  }

  return (
    <div className="space-y-3">
      <Label>Format & quality</Label>
      <Tabs value={category} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="video" className="gap-1.5">
            <Film className="size-3.5" />
            Video
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-1.5">
            <Music className="size-3.5" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5">
            <Settings2 className="size-3.5" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="mt-3 space-y-2">
          <Select value={videoSelectValue} onValueChange={onFormatChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select video format" />
            </SelectTrigger>
            <SelectContent>
              {qualityPresets.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Recommended</SelectLabel>
                  {qualityPresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {grouped.combined.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Video + Audio</SelectLabel>
                  {grouped.combined.map((f) => (
                    <SelectItem key={f.format_id} value={f.format_id}>
                      {formatLabel(f)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {grouped.videoOnly.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Video only (merges best audio)</SelectLabel>
                  {grouped.videoOnly.map((f) => (
                    <SelectItem
                      key={f.format_id}
                      value={`${f.format_id}+bestaudio[ext=m4a]/bestaudio`}
                    >
                      {formatLabel(f)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          {!hasVideoOptions && (
            <p className="text-xs text-muted-foreground">
              No formats listed — use the Custom tab or update yt-dlp.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Separate streams are merged via ffmpeg (
            <code className="font-mono">--merge-output-format</code>).
          </p>
        </TabsContent>

        <TabsContent value="audio" className="mt-3 space-y-2">
          <Select value={audioSelectValue} onValueChange={onFormatChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select audio format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Audio streams</SelectLabel>
                {grouped.audioOnly.map((f) => (
                  <SelectItem key={f.format_id} value={f.format_id}>
                    {formatLabel(f)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Maps to yt-dlp <code className="font-mono">-f bestaudio</code> or a
            specific format ID.
          </p>
        </TabsContent>

        <TabsContent value="custom" className="mt-3 space-y-2">
          <Select
            value={customPresetId}
            onValueChange={handleCustomPresetChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Presets</SelectLabel>
                {availablePresets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {maxHeight > 0 && maxHeight < 2160 && (
            <p className="text-xs text-muted-foreground">
              This video maxes out at{" "}
              <strong className="font-medium text-foreground">
                {maxLabel}
              </strong>{" "}
              on YouTube — 4K presets are hidden.
            </p>
          )}
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-medium">Selected format string</p>
            <Badge variant="secondary" className="max-w-full font-mono text-xs">
              <span className="truncate">-f {format}</span>
            </Badge>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
