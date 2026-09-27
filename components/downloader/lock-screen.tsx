"use client"

import { AlertCircle, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DownloaderHeader } from "@/components/downloader/header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface LockScreenProps {
  onUnlocked: () => void
}

export function LockScreen({ onUnlocked }: LockScreenProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? "Incorrect password")
      }

      toast.success("Workspace unlocked", {
        description: "Welcome back! Your session is active for 30 days.",
      })
      onUnlocked()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed"
      setError(message)
      toast.error("Unlock failed", { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-gradient-to-b from-muted/40 via-background to-background">
      <DownloaderHeader />

      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[100px] dark:bg-red-600/15" />
        <div className="absolute top-1/3 left-1/3 h-[250px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[90px] dark:bg-amber-500/10" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Card className="w-full max-w-md border-border/70 bg-card/80 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/20">
              <Lock className="size-7" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                <ShieldCheck className="size-3.5" />
                <span>Protected Workspace</span>
              </div>
              <CardTitle className="font-heading text-xl sm:text-2xl">
                Access Locked
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                This downloader instance is secured. Please enter the secret
                passphrase configured in your environment to continue.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <p className="flex-1 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="app-secret-input"
                  className="block text-xs font-medium text-foreground"
                >
                  Secret Passphrase
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <KeyRound className="size-4" />
                  </div>
                  <Input
                    id="app-secret-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter secret passphrase…"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pl-9 pr-10 text-sm"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={loading || !password.trim()}
                className="w-full bg-red-600 font-medium text-white shadow-md transition-all hover:bg-red-700 hover:shadow-red-600/25 active:scale-[0.99] dark:bg-red-600 dark:hover:bg-red-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Unlock Workspace
                  </>
                )}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Managed securely with 30-day encrypted session tokens.
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
