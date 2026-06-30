#Requires -Version 5.1
<#
.SYNOPSIS
  Starts the YouTube Downloader local agent on your Windows PC.

.DESCRIPTION
  The Vercel website connects to this agent so downloads run on your machine
  (yt-dlp + ffmpeg) without opening localhost in the browser.

.PARAMETER VercelUrl
  Your live site URL, e.g. https://myapp.vercel.app

.PARAMETER Port
  Local port (default 3000)
#>
param(
  [string]$VercelUrl = $env:VERCEL_SITE_URL,
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Test-Command($Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command node)) {
  Write-Error "Node.js is not installed. Open your site's PC Setup guide first."
}
if (-not (Test-Command yt-dlp)) {
  Write-Warning "yt-dlp not found on PATH. Install it before downloading."
}
if (-not (Test-Command ffmpeg)) {
  Write-Warning "ffmpeg not found on PATH. Install it before downloading."
}

if (-not $VercelUrl) {
  $VercelUrl = Read-Host "Enter your Vercel site URL (e.g. https://myapp.vercel.app)"
}

$VercelUrl = $VercelUrl.TrimEnd("/")
$origins = "http://localhost:$Port,http://127.0.0.1:$Port,$VercelUrl"
$env:ALLOWED_ORIGINS = $origins
$env:PORT = "$Port"

Write-Host ""
Write-Host "=== YouTube Downloader — Local Agent ===" -ForegroundColor Cyan
Write-Host "Port:            $Port"
Write-Host "Allowed origins: $origins"
Write-Host ""
Write-Host "1. Keep this window open while using the live website."
Write-Host "2. Open your Vercel site and click 'Auto-connect to this PC'."
Write-Host "   Or open: $VercelUrl/?agent=http://127.0.0.1:$Port"
Write-Host ""

if (-not (Test-Path "$ProjectRoot\.next")) {
  Write-Host "Building app (first run)..." -ForegroundColor Yellow
  npm run build
}

npm start
