"use client"

import { Cookie, Moon, Play, Sun } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DownloaderHeaderProps {
  onOpenCookieModal?: () => void
}

export function DownloaderHeader({ onOpenCookieModal }: DownloaderHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
            <Play className="size-4.5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm leading-none font-semibold">
              YouTube Downloader
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Powered by yt-dlp
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {onOpenCookieModal && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenCookieModal}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Cookie className="size-3.5 text-red-600" />
                  <span className="hidden sm:inline">Cookies</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Update or view YouTube session cookies</TooltipContent>
            </Tooltip>
          )}

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
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}
