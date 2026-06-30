import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LegalNotice() {
  return (
    <Alert>
      <AlertTitle className="text-sm">Local &amp; legal use</AlertTitle>
      <AlertDescription className="text-xs leading-relaxed">
        Runs on your PC only — nothing is sent to third-party services. Download
        only videos you own or have permission to save (your uploads, licensed
        content, or where the law allows). Respect YouTube&apos;s Terms of
        Service and copyright law. Temp files on your machine are auto-deleted
        after you save through the browser.
      </AlertDescription>
    </Alert>
  )
}
