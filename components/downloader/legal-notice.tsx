import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function LegalNotice() {
  return (
    <Alert>
      <AlertTitle className="text-sm">Personal &amp; legal use</AlertTitle>
      <AlertDescription className="text-xs leading-relaxed">
        Downloads are processed on this server only while your job runs. Files
        are streamed straight to your device and removed from the server
        automatically afterwards. No accounts, tracking, or third-party
        analytics. Download only videos you own or have permission to save (your
        uploads, licensed content, or where the law allows). Respect
        YouTube&apos;s Terms of Service and copyright law.
      </AlertDescription>
    </Alert>
  )
}
