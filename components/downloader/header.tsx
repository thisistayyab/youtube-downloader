"use client"

import { BookOpen, Download, Moon, Play, Sun } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Downloader", icon: Download },
  { href: "/setup", label: "PC Setup", icon: BookOpen },
] as const

export function DownloaderHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
            <Play className="size-4.5 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="font-heading truncate text-sm font-semibold leading-none">
              YouTube Downloader
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Powered by yt-dlp
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="mr-1 hidden items-center gap-0.5 sm:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href)

              return (
                <Button
                  key={href}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-8 gap-1.5", active && "font-medium")}
                  asChild
                >
                  <Link href={href}>
                    <Icon className="size-3.5" />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </nav>

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

      <nav className="flex border-t sm:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
