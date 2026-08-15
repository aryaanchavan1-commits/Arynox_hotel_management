# Arynox Hotel ERP - Deploy script (all on Vercel: backend API + frontend, Turso DB)
# Reads tokens from .env and deploys both Vercel projects.

param(
  [switch]$SkipPush,
  [switch]$SkipBackend,
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# ---- load .env ----
$envVars = @{}
Get-Content (Join-Path $root ".env") | Where-Object { $_ -match "^\s*[A-Za-z_][A-Za-z0-9_]*=" } | ForEach-Object {
  $parts = $_ -split "=", 2
  $envVars[$parts[0].Trim()] = $parts[1].Trim()
}

$vercelToken = $envVars["VERCEL_TOKEN"]
$tursoUrl    = $envVars["TURSO_DATABASE_URL"]
$tursoToken  = $envVars["TURSO_AUTH_TOKEN"]
$groqKey     = $envVars["GROQ_API_KEY"]
$jwtSecret   = $envVars["ARYNOX_JWT_SECRET"]

if (-not $vercelToken) { throw "VERCEL_TOKEN missing in .env" }

# ================= 1. PUSH TO GITHUB =================
if (-not $SkipPush) {
  Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
  Push-Location $root
  git add -A
  git commit -m "Arynox Hotel ERP: hotel+restaurant+POS, AI assistant, ESC/POS receipts, Turso DB" --allow-empty
  git push -u origin main 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "git push failed. Check GitHub auth (git credential manager). Continuing anyway."
  }
  Pop-Location
}

# ================= 2. BACKEND (Vercel, serverless) =================
if (-not $SkipBackend) {
  Write-Host "`n=== Deploying backend to Vercel ===" -ForegroundColor Cyan

  # ensure env vars on the arynox-hotel-api project
  $h = @{ Authorization = "Bearer $vercelToken"; "Content-Type" = "application/json" }
  $vars = @{
    TURSO_DATABASE_URL = $tursoUrl
    TURSO_AUTH_TOKEN   = $tursoToken
    ARYNOX_JWT_SECRET  = $jwtSecret
  }
  if ($groqKey) { $vars["GROQ_API_KEY"] = $groqKey }
  foreach ($k in $vars.Keys) {
    if (-not $vars[$k]) { throw "Missing $k in .env" }
    $body = @{ key = $k; value = $vars[$k]; type = "encrypted"; target = @("production", "preview", "development") } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v9/projects/arynox-hotel-api/env" `
      -Headers $h -Body $body | Out-Null
  }
  Write-Host "Env vars ensured on arynox-hotel-api." -ForegroundColor Green

  Push-Location (Join-Path $root "backend")
  $env:VERCEL_TOKEN = $vercelToken
  vercel deploy --prod --yes --token $vercelToken 2>&1 | Out-Host
  Pop-Location
}

# ================= 3. FRONTEND (Vercel) =================
if (-not $SkipFrontend) {
  Write-Host "`n=== Deploying frontend to Vercel ===" -ForegroundColor Cyan
  Push-Location (Join-Path $root "frontend")
  $env:VERCEL_TOKEN = $vercelToken
  vercel deploy --prod --yes --token $vercelToken 2>&1 | Out-Host
  Pop-Location
}

Write-Host "`n=== DEPLOY COMPLETE ===" -ForegroundColor Green
Write-Host "Frontend : https://arynox-hotel-erp.vercel.app"
Write-Host "Backend  : https://arynox-hotel-api.vercel.app"
Write-Host "Health   : https://arynox-hotel-api.vercel.app/api/health"
Write-Host "Database : Turso (online)"