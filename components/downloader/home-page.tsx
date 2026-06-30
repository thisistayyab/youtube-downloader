"use client"

import { useCallback, useEffect, useState } from "react"

import { DownloaderApp } from "@/components/downloader/downloader-app"
import { DownloaderHeader } from "@/components/downloader/header"
import {
  LocalAgentConnect,
  LocalAgentStatus,
} from "@/components/downloader/local-agent-connect"
import { SetupGuide } from "@/components/downloader/setup-guide"
import { Skeleton } from "@/components/ui/skeleton"
import {
  apiFetch,
  discoverLocalAgent,
  getAgentUrlFromQuery,
  getStoredAgentUrl,
  setStoredAgentUrl,
} from "@/lib/api-client"
import type { AppCapabilities } from "@/lib/capabilities"

async function fetchAgentCapabilities(
  agentUrl: string
): Promise<AppCapabilities | null> {
  try {
    const res = await apiFetch("/api/capabilities", { cache: "no-store" }, agentUrl)
    if (!res.ok) return null
    const data = (await res.json()) as AppCapabilities
    if (data.hostedMode) return null
    if (!data.ytdlp.available || !data.ffmpeg.available) return null
    return data
  } catch {
    return null
  }
}

export function HomePage() {
  const [capabilities, setCapabilities] = useState<AppCapabilities | null>(null)
  const [agentUrl, setAgentUrl] = useState<string | null>(null)
  const [agentCapabilities, setAgentCapabilities] =
    useState<AppCapabilities | null>(null)
  const [isResolving, setIsResolving] = useState(true)

  const tryConnectAgent = useCallback(async (url: string) => {
    const caps = await fetchAgentCapabilities(url)
    if (caps) {
      setAgentUrl(url)
      setAgentCapabilities(caps)
      setStoredAgentUrl(url)
      return true
    }
    return false
  }, [])

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const cloudRes = await fetch("/api/capabilities", { cache: "no-store" })
        .then((res) => res.json() as Promise<AppCapabilities>)
        .catch(
          (): AppCapabilities => ({
            downloadsAvailable: false,
            hostedMode: true,
            message: "Cloud host — connect your Windows PC to download.",
            ytdlp: { available: false, error: "Use local agent." },
            ffmpeg: { available: false, error: "Use local agent." },
          })
        )

      if (cancelled) return
      setCapabilities(cloudRes)

      if (!cloudRes.hostedMode) {
        setIsResolving(false)
        return
      }

      let connected = false
      const queryUrl = getAgentUrlFromQuery()
      const storedUrl = getStoredAgentUrl()
      const candidates = [queryUrl, storedUrl].filter(Boolean) as string[]

      for (const candidate of candidates) {
        if (cancelled || connected) break
        connected = await tryConnectAgent(candidate)
      }

      if (!cancelled && !connected) {
        const discovered = await discoverLocalAgent()
        if (discovered && !cancelled) {
          await tryConnectAgent(discovered)
        }
      }

      if (!cancelled) setIsResolving(false)
    }

    void resolve()

    return () => {
      cancelled = true
    }
  }, [tryConnectAgent])

  const handleAgentConnected = useCallback((url: string, caps: AppCapabilities) => {
    setAgentUrl(url)
    setAgentCapabilities(caps)
  }, [])

  const handleDisconnect = useCallback(() => {
    setStoredAgentUrl(null)
    setAgentUrl(null)
    setAgentCapabilities(null)
  }, [])

  if (!capabilities || isResolving) {
    return (
      <div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
        <DownloaderHeader />
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    )
  }

  if (!capabilities.hostedMode) {
    return <DownloaderApp capabilities={capabilities} />
  }

  if (agentUrl && agentCapabilities) {
    return (
      <DownloaderApp
        capabilities={agentCapabilities}
        apiBaseUrl={agentUrl}
        agentStatus={
          <LocalAgentStatus
            agentUrl={agentUrl}
            capabilities={agentCapabilities}
            onDisconnect={handleDisconnect}
          />
        }
      />
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
      <DownloaderHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-2 text-center sm:text-left">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            YouTube Downloader
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            This site is hosted online. Connect your Windows PC below to start
            downloading — everything still runs locally on your machine.
          </p>
        </section>

        <LocalAgentConnect onConnected={handleAgentConnected} />

        <SetupGuide />
      </main>
    </div>
  )
}
