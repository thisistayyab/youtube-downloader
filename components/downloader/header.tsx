"use client"

import { Moon, Play, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function DownloaderHeader() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
            <Play className="size-4.5 fill-current" />
          </div>
          <div>
            <p className="font-heading text-sm font-semibold leading-none">
              YouTube Downloader
            </p>
            <p className="text-xs text-muted-foreground">Powered by yt-dlp</p>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              aria-label="Toggle theme"
            >
              <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme (D)</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
