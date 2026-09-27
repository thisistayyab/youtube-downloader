"use client"

import {
  CheckCircle2,
  ClipboardPaste,
  Cookie,
  KeyRound,
  Loader2,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"

interface CookieStatusResponse {
  loaded: boolean
  source: "runtime" | "secret_file" | "env" | "local" | "none"
  path: string | null
  sizeBytes: number
  lineCount: number
  requiresSecret: boolean
}

interface CookieUpdaterModalProps {
  isOpen: boolean
  onClose: () => void
  onCookiesUpdated?: () => void
}

export function CookieUpdaterModal({
  isOpen,
  onClose,
  onCookiesUpdated,
}: CookieUpdaterModalProps) {
  const [status, setStatus] = useState<CookieStatusResponse | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [cookiesText, setCookiesText] = useState("")
  const [secret, setSecret] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true)
    try {
      const res = await fetch("/api/admin/cookies", { cache: "no-store" })
      if (res.ok) {
        const data = (await res.json()) as CookieStatusResponse
        setStatus(data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void fetchStatus()
    }
  }, [isOpen, fetchStatus])

  if (!isOpen) return null

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setCookiesText(text)
        toast.success("Cookies pasted from clipboard!")
      }
    } catch {
      toast.error("Could not read from clipboard", {
        description: "Please paste your cookies directly into the text box.",
      })
    }
  }

  const handleSave = async () => {
    if (!cookiesText.trim()) {
      toast.error("Cookie text cannot be empty")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookiesContent: cookiesText,
          secret: secret.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save cookies")
      }

      toast.success("Session cookies saved!", {
        description: `Loaded ${data.lineCount ?? "valid"} cookie entries into server memory.`,
      })
      setCookiesText("")
      await fetchStatus()
      onCookiesUpdated?.()
    } catch (err) {
      toast.error("Failed to save cookies", {
        description: err instanceof Error ? err.message : "Something went wrong",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/admin/cookies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secret.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete cookies")
      }

      toast.success("Runtime cookies removed", {
        description: "Server runtime session cookies were cleared.",
      })
      await fetchStatus()
      onCookiesUpdated?.()
    } catch (err) {
      toast.error("Failed to delete cookies", {
        description: err instanceof Error ? err.message : "Something went wrong",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 text-card-foreground shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600/10 text-red-600">
            <Cookie className="size-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Update YouTube Cookies
            </h2>
            <p className="text-xs text-muted-foreground">
              Bypass cloud IP bot verification instantly without redeploying.
            </p>
          </div>
        </div>

        {/* Status preview */}
        <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">
              Current Server Status:
            </span>
            {isLoadingStatus ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : status?.loaded ? (
              <Badge variant="outline" className="border-emerald-600/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-1 size-3" />
                Active ({status.source} · {Math.round(status.sizeBytes / 1024)} KB)
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-600/40 text-amber-600 dark:text-amber-400">
                <XCircle className="mr-1 size-3" />
                No Cookies Detected
              </Badge>
            )}
          </div>
          {status?.source === "runtime" && (
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              In-app session is active. You can clear or overwrite it below.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {status?.requiresSecret && (
            <div className="space-y-1.5">
              <Label htmlFor="cookie-secret" className="text-xs">
                Admin Password
              </Label>
              <Input
                id="cookie-secret"
                type="password"
                placeholder="Enter ADMIN_SECRET password..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cookie-textarea" className="text-xs">
                Paste cookies.txt contents
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={handlePasteClipboard}
              >
                <ClipboardPaste className="mr-1 size-3" />
                Paste from Clipboard
              </Button>
            </div>
            <Textarea
              id="cookie-textarea"
              rows={6}
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / TRUE ..."
              value={cookiesText}
              onChange={(e) => setCookiesText(e.target.value)}
              className="font-mono text-[0.75rem] leading-relaxed"
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Export fresh cookies with the <strong>Get cookies.txt LOCALLY</strong> extension while logged into YouTube.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
          <div>
            {status?.source === "runtime" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Clear In-App Cookies
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting || !cookiesText.trim()}
              className="bg-red-600 text-xs text-white hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                  Save & Apply
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
