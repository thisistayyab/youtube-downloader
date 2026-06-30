import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LegalNotice() {
  return (
    <Alert>
      <AlertTitle className="text-sm">Personal use only</AlertTitle>
      <AlertDescription className="text-xs leading-relaxed">
        This tool runs yt-dlp on your server to download content you paste.
        Only download videos you own or have permission to save. Respect
        YouTube&apos;s Terms of Service and copyright law. URLs and files are
        processed locally, kept in memory briefly, and auto-deleted — nothing
        is sent to third-party analytics.
      </AlertDescription>
    </Alert>
  )
}
