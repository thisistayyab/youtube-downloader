const STORAGE_KEY = "yt-downloader-agent-url"

const DEFAULT_PORTS = [3000, 3847]

function parsePortList(raw: string | undefined): number[] {
  if (!raw?.trim()) return DEFAULT_PORTS
  const ports = raw
    .split(",")
    .map((p) => Number.parseInt(p.trim(), 10))
    .filter((p) => Number.isFinite(p) && p > 0 && p < 65536)
  return ports.length > 0 ? ports : DEFAULT_PORTS
}

export function normalizeAgentUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ""

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `http://${trimmed}`

  const url = new URL(withProtocol)
  url.pathname = url.pathname.replace(/\/$/, "")
  return url.origin
}

export function getStoredAgentUrl(): string | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? normalizeAgentUrl(stored) : null
}

export function setStoredAgentUrl(url: string | null): void {
  if (typeof window === "undefined") return
  if (!url) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, normalizeAgentUrl(url))
}

export function getAgentUrlFromQuery(): string | null {
  if (typeof window === "undefined") return null
  const agent = new URLSearchParams(window.location.search).get("agent")
  return agent ? normalizeAgentUrl(agent) : null
}

export function buildApiUrl(path: string, baseUrl?: string | null): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const base = baseUrl?.trim()
  if (!base) return normalizedPath
  return `${normalizeAgentUrl(base)}${normalizedPath}`
}

export function getDiscoveryCandidates(): string[] {
  const candidates = new Set<string>()

  const envUrl = process.env.NEXT_PUBLIC_LOCAL_AGENT_URL?.trim()
  if (envUrl) candidates.add(normalizeAgentUrl(envUrl))

  const ports = parsePortList(process.env.NEXT_PUBLIC_LOCAL_AGENT_PORTS)
  for (const port of ports) {
    candidates.add(`http://127.0.0.1:${port}`)
    candidates.add(`http://localhost:${port}`)
  }

  return [...candidates]
}

export async function probeAgentUrl(
  baseUrl: string,
  timeoutMs = 2500
): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl("/api/capabilities", baseUrl), {
      cache: "no-store",
      mode: "cors",
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { hostedMode?: boolean }
    return !data.hostedMode
  } catch {
    return false
  }
}

export async function discoverLocalAgent(): Promise<string | null> {
  for (const candidate of getDiscoveryCandidates()) {
    if (await probeAgentUrl(candidate)) return candidate
  }
  return null
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
  baseUrl?: string | null
): Promise<Response> {
  return fetch(buildApiUrl(path, baseUrl), {
    ...init,
    mode: "cors",
  })
}
