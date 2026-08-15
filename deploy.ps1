# Arynox Hotel ERP - Deploy script (single Next.js app on Vercel: UI + API colocated, Turso DB)
# Reads tokens from .env and deploys the frontend project.

param(
  [switch]$SkipPush
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
  git commit -m "Arynox Hotel ERP: Next.js app, hotel+restaurant+POS, AI assistant, ESC/POS receipts, Turso DB" --allow-empty
  git push -u origin main 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "git push failed. Check GitHub auth (git credential manager). Continuing anyway."
  }
  Pop-Location
}

# ================= 2. ENV VARS on arynox-hotel-erp =================
Write-Host "`n=== Ensuring env vars on arynox-hotel-erp ===" -ForegroundColor Cyan
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
  Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v9/projects/arynox-hotel-erp/env" `
    -Headers $h -Body $body | Out-Null
}
Write-Host "Env vars ensured on arynox-hotel-erp." -ForegroundColor Green

# ================= 3. DEPLOY (single project) =================
Write-Host "`n=== Deploying to Vercel ===" -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend")
$env:VERCEL_TOKEN = $vercelToken
vercel deploy --prod --force --yes --token $vercelToken 2>&1 | Out-Host
Pop-Location

Write-Host "`n=== DEPLOY COMPLETE ===" -ForegroundColor Green
Write-Host "App     : https://arynox-hotel-erp.vercel.app"
Write-Host "Health  : https://arynox-hotel-erp.vercel.app/api/health"
Write-Host "Database : Turso (online)"