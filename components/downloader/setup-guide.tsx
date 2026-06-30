"use client"

import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ExternalLink,
  Monitor,
  Terminal,
} from "lucide-react"
import { useCallback, useState } from "react"

import { LegalNotice } from "@/components/downloader/legal-notice"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { REPO_CLONE_URL } from "@/lib/site-config"
import { cn } from "@/lib/utils"

function CodeBlock({
  code,
  label,
}: {
  code: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative rounded-lg border bg-muted/50">
      {label ? (
        <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed sm:text-sm">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        onClick={copy}
        aria-label="Copy command"
      >
        <Copy className="size-3.5" />
        <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  )
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">
            {step}
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

const CHECKLIST = [
  "Node.js 20+ installed (`node --version`)",
  "yt-dlp installed (`yt-dlp --version`)",
  "ffmpeg installed (`ffmpeg -version`)",
  "Project folder downloaded and `npm install` completed",
  "`npm run agent` running (or `npm run dev` for localhost only)",
  "Live site shows Connected to your PC (or localhost:3000 works)",
  "You only download content you have the right to save",
]

function WindowsGuide() {
  return (
    <div className="space-y-4">
      <StepCard step={1} title="Install Node.js">
        <p>
          Download the <strong className="text-foreground">LTS</strong> installer
          from{" "}
          <a
            href="https://nodejs.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            nodejs.org
          </a>
          . Run it and keep <strong className="text-foreground">Add to PATH</strong>{" "}
          checked.
        </p>
        <CodeBlock
          label="Verify in PowerShell"
          code={`node --version\nnpm --version`}
        />
      </StepCard>

      <StepCard step={2} title="Install yt-dlp">
        <p>Easiest method — winget in PowerShell:</p>
        <CodeBlock code="winget install yt-dlp.yt-dlp" />
        <p>
          Close and reopen PowerShell, then verify with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">yt-dlp --version</code>.
          If winget is unavailable, download{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">yt-dlp.exe</code>{" "}
          from{" "}
          <a
            href="https://github.com/yt-dlp/yt-dlp/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            GitHub releases
          </a>{" "}
          and set <code className="rounded bg-muted px-1 py-0.5 text-foreground">YTDLP_PATH</code>{" "}
          in <code className="rounded bg-muted px-1 py-0.5 text-foreground">.env.local</code>.
        </p>
      </StepCard>

      <StepCard step={3} title="Install ffmpeg">
        <p>Required to merge video + audio (1080p, 4K, thumbnails).</p>
        <CodeBlock code="winget install Gyan.FFmpeg" />
        <p>
          Verify with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">ffmpeg -version</code>.
          Manual install: get the{" "}
          <strong className="text-foreground">essentials</strong> build from{" "}
          <a
            href="https://www.gyan.dev/ffmpeg/builds/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            gyan.dev/ffmpeg/builds
          </a>
          , extract it, and add the <code className="rounded bg-muted px-1 py-0.5 text-foreground">bin</code>{" "}
          folder to PATH or set <code className="rounded bg-muted px-1 py-0.5 text-foreground">FFMPEG_PATH</code>.
        </p>
      </StepCard>

      <StepCard step={4} title="Get the project on your PC">
        <p>Clone with Git, or download this repository as a ZIP and extract it.</p>
        <CodeBlock
          label="PowerShell"
          code={`cd $HOME\\Documents\ngit clone ${REPO_CLONE_URL} youtube-downloader\ncd youtube-downloader`}
        />
      </StepCard>

      <StepCard step={5} title="Install app dependencies">
        <CodeBlock code="npm install" />
      </StepCard>

      <StepCard step={6} title="Configure paths (only if needed)">
        <p>
          Skip this if <code className="rounded bg-muted px-1 py-0.5 text-foreground">yt-dlp</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">ffmpeg</code> work in PowerShell.
        </p>
        <CodeBlock
          label="PowerShell"
          code={`Copy-Item .env.example .env.local\nnotepad .env.local`}
        />
        <CodeBlock
          label=".env.local example"
          code={`YTDLP_PATH=C:\\tools\\yt-dlp.exe\nFFMPEG_PATH=C:\\ffmpeg\\bin\nDOWNLOAD_DIR=./downloads`}
        />
      </StepCard>

      <StepCard step={7} title="Start the local agent (for the live Vercel site)">
        <p>
          If you use the hosted website, run this on your PC so the live site can
          connect without localhost:
        </p>
        <CodeBlock code="npm run agent" />
        <p>
          Enter your Vercel URL when prompted. Keep the window open, then on the
          live site click <strong className="text-foreground">Auto-connect to this PC</strong>.
        </p>
        <p className="text-xs">
          For local-only use (no Vercel), you can use{" "}
          <code className="rounded bg-muted px-1 text-foreground">npm run dev</code>{" "}
          and open{" "}
          <a
            href="http://localhost:3000"
            className="font-medium text-foreground underline underline-offset-2"
          >
            localhost:3000
          </a>
          .
        </p>
      </StepCard>

      <StepCard step={8} title="Download a video legally">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Paste a YouTube URL and fetch video info.</li>
          <li>Choose a format (1080p MP4 is a good default).</li>
          <li>Click Download, then save the file when the job completes.</li>
          <li>
            Files save to your browser&apos;s Downloads folder. Temp files on your PC
            are auto-deleted after about an hour.
          </li>
        </ol>
      </StepCard>
    </div>
  )
}

function MacGuide() {
  return (
    <div className="space-y-4">
      <StepCard step={1} title="Install Homebrew (if needed)">
        <p>
          See{" "}
          <a
            href="https://brew.sh/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            brew.sh
          </a>{" "}
          for the one-line install command.
        </p>
      </StepCard>
      <StepCard step={2} title="Install Node.js, yt-dlp, and ffmpeg">
        <CodeBlock code="brew install node@20 yt-dlp ffmpeg" />
        <CodeBlock
          label="Verify"
          code="node --version\nyt-dlp --version\nffmpeg -version"
        />
      </StepCard>
      <StepCard step={3} title="Run the app">
        <CodeBlock
          code={`git clone ${REPO_CLONE_URL}\ncd youtube-downloader\nnpm install\nnpm run dev`}
        />
        <p>
          Open{" "}
          <a
            href="http://localhost:3000"
            className="font-medium text-foreground underline underline-offset-2"
          >
            http://localhost:3000
          </a>
          .
        </p>
      </StepCard>
    </div>
  )
}

function LinuxGuide() {
  return (
    <div className="space-y-4">
      <StepCard step={1} title="Install Node.js 20, yt-dlp, and ffmpeg">
        <CodeBlock
          label="Debian / Ubuntu"
          code={`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\nsudo apt-get install -y nodejs\nsudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp\nsudo chmod a+rx /usr/local/bin/yt-dlp\nsudo apt-get update && sudo apt-get install -y ffmpeg`}
        />
      </StepCard>
      <StepCard step={2} title="Run the app">
        <CodeBlock
          code={`git clone ${REPO_CLONE_URL}\ncd youtube-downloader\nnpm install\nnpm run dev`}
        />
        <p>
          Open{" "}
          <a
            href="http://localhost:3000"
            className="font-medium text-foreground underline underline-offset-2"
          >
            http://localhost:3000
          </a>
          .
        </p>
      </StepCard>
    </div>
  )
}

function PathHelp() {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <div>
              <p className="text-sm font-medium">Adding a folder to PATH (Windows)</p>
              <p className="text-xs text-muted-foreground">
                Only if you installed yt-dlp or ffmpeg manually
              </p>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Search Windows for &quot;environment variables&quot;.</li>
              <li>Open <strong className="text-foreground">Edit the system environment variables</strong>.</li>
              <li>Click <strong className="text-foreground">Environment Variables…</strong> → User <strong className="text-foreground">Path</strong> → <strong className="text-foreground">Edit</strong>.</li>
              <li>Add your folder (e.g. <code className="rounded bg-muted px-1 text-foreground">C:\tools</code> or ffmpeg <code className="rounded bg-muted px-1 text-foreground">bin</code>).</li>
              <li>Restart PowerShell and verify the commands again.</li>
            </ol>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

interface SetupGuideProps {
  showHostedBanner?: boolean
}

export function SetupGuide({ showHostedBanner = false }: SetupGuideProps) {
  const [checked, setChecked] = useState<boolean[]>(() =>
    CHECKLIST.map(() => false)
  )

  const toggleCheck = (index: number) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <div className="space-y-6">
      {showHostedBanner ? (
        <Alert>
          <Monitor className="size-4" />
          <AlertTitle>Use the live website with your Windows PC</AlertTitle>
          <AlertDescription>
            Vercel cannot run downloads in the cloud. Install the tools below, then
            run <code className="rounded bg-muted px-1">npm run agent</code> on
            your PC. Return to this live site and click{" "}
            <strong className="text-foreground">Auto-connect</strong> — no need
            to open localhost.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Terminal className="size-3" />
            Local PC setup
          </Badge>
          <Badge variant="outline">~15–30 min first time</Badge>
        </div>
        <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          Install on your computer, then download
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          You need three free tools on your PC: <strong className="text-foreground">Node.js</strong>{" "}
          (runs the app), <strong className="text-foreground">yt-dlp</strong> (downloads from
          YouTube), and <strong className="text-foreground">ffmpeg</strong> (merges video and
          audio). Follow the steps for your operating system.
        </p>
        <LegalNotice />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What you need</CardTitle>
          <CardDescription>All processing happens on your PC after setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "Node.js 20+", desc: "Runs the web app" },
              { name: "yt-dlp", desc: "Fetches and downloads media" },
              { name: "ffmpeg", desc: "Merges streams & embeds metadata" },
            ].map((item) => (
              <div
                key={item.name}
                className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm"
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="windows">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="windows">Windows</TabsTrigger>
          <TabsTrigger value="macos">macOS</TabsTrigger>
          <TabsTrigger value="linux">Linux</TabsTrigger>
        </TabsList>
        <TabsContent value="windows" className="mt-4 space-y-4">
          <WindowsGuide />
          <PathHelp />
        </TabsContent>
        <TabsContent value="macos" className="mt-4">
          <MacGuide />
        </TabsContent>
        <TabsContent value="linux" className="mt-4">
          <LinuxGuide />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before your first download</CardTitle>
          <CardDescription>Tick each item as you complete it</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleCheck(index)}
              className="flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
            >
              {checked[index] ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  checked[index] && "text-muted-foreground line-through"
                )}
              >
                {item}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="size-4" />
            After setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Run <code className="rounded bg-muted px-1 py-0.5 text-foreground">npm run dev</code>{" "}
            in the project folder and use the downloader at{" "}
            <a
              href="http://localhost:3000"
              className="font-medium text-foreground underline underline-offset-2"
            >
              http://localhost:3000
            </a>
            . Only download content you own or have permission to save.
          </p>
          <p>
            Update yt-dlp regularly — YouTube changes often:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">winget upgrade yt-dlp.yt-dlp</code>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
