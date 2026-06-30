"use client"

import { Loader2, Monitor, Plug, RefreshCw, Unplug, Wifi } from "lucide-react"
import Link from "next/link"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  apiFetch,
  discoverLocalAgent,
  normalizeAgentUrl,
  probeAgentUrl,
  setStoredAgentUrl,
} from "@/lib/api-client"
import type { AppCapabilities } from "@/lib/capabilities"

interface LocalAgentConnectProps {
  onConnected: (url: string, capabilities: AppCapabilities) => void
  initialUrl?: string | null
}

export function LocalAgentConnect({
  onConnected,
  initialUrl = null,
}: LocalAgentConnectProps) {
  const [manualUrl, setManualUrl] = useState(initialUrl ?? "")
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const connectToUrl = useCallback(
    async (rawUrl: string, source: "manual" | "auto" | "discover") => {
      const url = normalizeAgentUrl(rawUrl)
      if (!url) {
        setLastError("Enter a valid URL (e.g. http://127.0.0.1:3000 or your tunnel URL).")
        return
      }

      setIsConnecting(true)
      setLastError(null)

      try {
        const reachable = await probeAgentUrl(url)
        if (!reachable) {
          throw new Error(
            "Could not reach the local agent. Start it on your Windows PC first (see below)."
          )
        }

        const res = await apiFetch("/api/capabilities", { cache: "no-store" }, url)
        const capabilities = (await res.json()) as AppCapabilities

        if (capabilities.hostedMode) {
          throw new Error("That URL points to another cloud site, not your PC agent.")
        }

        if (!capabilities.ytdlp.available || !capabilities.ffmpeg.available) {
          throw new Error(
            capabilities.ytdlp.error ??
              capabilities.ffmpeg.error ??
              "yt-dlp or ffmpeg is missing on your PC."
          )
        }

        setStoredAgentUrl(url)
        onConnected(url, capabilities)
        toast.success("Connected to your PC", {
          description:
            source === "discover"
              ? "Found the local agent running on this computer."
              : `Downloads will run via ${url}`,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect to your PC"
        setLastError(message)
        toast.error("Could not connect", { description: message })
      } finally {
        setIsConnecting(false)
      }
    },
    [onConnected]
  )

  const handleDiscover = useCallback(async () => {
    setIsConnecting(true)
    setLastError(null)
    try {
      const found = await discoverLocalAgent()
      if (!found) {
        throw new Error(
          "No local agent found on this PC. Run start-local-agent.ps1 on Windows, then try again."
        )
      }
      await connectToUrl(found, "discover")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Local agent not found"
      setLastError(message)
      toast.error("Auto-connect failed", { description: message })
      setIsConnecting(false)
    }
  }, [connectToUrl])

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="size-4" />
          Connect to your Windows PC
        </CardTitle>
        <CardDescription>
          The live website runs on Vercel. Downloads use yt-dlp on{" "}
          <strong className="text-foreground">your computer</strong> through a
          small local agent — no need to open localhost in the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Monitor className="size-4" />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              1. Install Node.js, yt-dlp, and ffmpeg on Windows ({" "}
              <Link href="/setup" className="underline underline-offset-2">
                setup guide
              </Link>
              ).
            </p>
            <p>
              2. Run <code className="rounded bg-muted px-1">start-local-agent.ps1</code>{" "}
              on your PC — it starts the agent in the background.
            </p>
            <p>
              3. On this page, click <strong className="text-foreground">Auto-connect</strong>{" "}
              (same PC) or paste a tunnel URL if you use the site from another device.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            disabled={isConnecting}
            onClick={handleDiscover}
          >
            {isConnecting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Wifi />
            )}
            Auto-connect to this PC
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isConnecting}
            onClick={() => void connectToUrl(manualUrl, "manual")}
          >
            {isConnecting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Connect manually
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-url">Agent URL (optional — for tunnel or custom port)</Label>
          <Input
            id="agent-url"
            placeholder="http://127.0.0.1:3000 or https://your-tunnel.trycloudflare.com"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            disabled={isConnecting}
          />
          <p className="text-xs text-muted-foreground">
            On the same Windows PC, auto-connect usually finds{" "}
            <code className="rounded bg-muted px-1">127.0.0.1:3000</code> automatically.
            From a phone or another computer, use a Cloudflare Tunnel or ngrok URL.
          </p>
        </div>

        {lastError ? (
          <Alert variant="destructive">
            <AlertDescription>{lastError}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function LocalAgentStatus({
  agentUrl,
  capabilities,
  onDisconnect,
}: {
  agentUrl: string
  capabilities: AppCapabilities
  onDisconnect: () => void
}) {
  return (
    <Alert className="border-green-500/40 bg-green-500/10">
      <Wifi className="size-4 text-green-600 dark:text-green-400" />
      <AlertTitle className="text-green-800 dark:text-green-300">
        Connected to your PC
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Downloads run via{" "}
          <code className="rounded bg-muted px-1 text-foreground">{agentUrl}</code>
          {capabilities.ytdlp.version
            ? ` · yt-dlp ${capabilities.ytdlp.version}`
            : null}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit shrink-0"
          onClick={onDisconnect}
        >
          <Unplug />
          Disconnect
        </Button>
      </AlertDescription>
    </Alert>
  )
}
