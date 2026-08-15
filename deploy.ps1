# Arynox Hotel ERP - Deploy script (Vercel frontend + Render backend)
# Reads tokens from .env and deploys both services.
# Requires: git push done first (Render pulls the repo from GitHub).

param(
  [switch]$SkipPush,
  [switch]$SkipRender,
  [switch]$SkipVercel
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
$renderKey   = $envVars["RENDER_API_KEY"]
$tursoUrl    = $envVars["TURSO_DATABASE_URL"]
$tursoToken  = $envVars["TURSO_AUTH_TOKEN"]
$groqKey     = $envVars["GROQ_API_KEY"]
$repoUrl     = "https://github.com/aryaanchavan1-commits/Arynox_hotel_management"

if (-not $vercelToken) { throw "VERCEL_TOKEN missing in .env" }
if (-not $renderKey)   { throw "RENDER_API_KEY missing in .env" }

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

# ================= 2. RENDER BACKEND =================
$renderUrl = $envVars["RENDER_URL"]
if (-not $SkipRender) {
  Write-Host "`n=== Deploying backend to Render ===" -ForegroundColor Cyan
  $ownerId = (Invoke-RestMethod -Uri "https://api.render.com/v1/owners" -Headers @{ Authorization = "Bearer $renderKey" }).owner.id

  $envVarsList = @(
    @{ key = "TURSO_DATABASE_URL"; value = $tursoUrl },
    @{ key = "TURSO_AUTH_TOKEN";   value = $tursoToken },
    @{ key = "PORT";               value = "10000" }
  )
  if ($groqKey) { $envVarsList += @{ key = "GROQ_API_KEY"; value = $groqKey } }

  $body = @{
    type         = "web_service"
    name         = "arynox-hotel-backend"
    ownerId      = $ownerId
    env          = "node"
    repo         = $repoUrl
    branch       = "main"
    rootDir      = "backend"
    plan         = "free"
    envVars      = $envVarsList
    serviceDetails = @{
      env = "node"
      envSpecificDetails = @{ buildCommand = "npm install"; startCommand = "node server.js" }
      healthCheckPath = "/api/health"
      numInstances = 1
      plan = "free"
      pullRequestPreviewsEnabled = "no"
      autoDeploy = "yes"
      openPorts = @(@{ port = 10000; protocol = "HTTP" })
    }
  } | ConvertTo-Json -Depth 8

  $res = Invoke-RestMethod -Method Post -Uri "https://api.render.com/v1/services" `
    -Headers @{ Authorization = "Bearer $renderKey"; "Content-Type" = "application/json" } `
    -Body $body
  $svc = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers @{ Authorization = "Bearer $renderKey" }
  $renderUrl = ($svc | Where-Object { $_.service.name -eq "arynox-hotel-backend" } | Select-Object -First 1).service.serviceDetails.url
  Write-Host "Render service created: $renderUrl" -ForegroundColor Green
  Write-Host "Backend deploy in progress (takes ~2-5 min)."

  # set env vars on the service (PUT replaces the full list)
  $envVarList = @(
    @{ key = "TURSO_DATABASE_URL"; value = $tursoUrl },
    @{ key = "TURSO_AUTH_TOKEN";   value = $tursoToken },
    @{ key = "PORT";               value = "10000" }
  )
  if ($groqKey) { $envVarList += @{ key = "GROQ_API_KEY"; value = $groqKey } }
  $envJson = $envVarList | ConvertTo-Json -Depth 4
  $sid = ($svc | Where-Object { $_.service.name -eq "arynox-hotel-backend" } | Select-Object -First 1).service.id
  Invoke-RestMethod -Method Put -Uri "https://api.render.com/v1/services/$sid/env-vars" `
    -Headers @{ Authorization = "Bearer $renderKey"; "Content-Type" = "application/json" } `
    -Body $envJson | Out-Null
  Write-Host "Env vars set on Render service." -ForegroundColor Green
} else {
  Write-Host "Skipping Render deploy (SkipRender). RENDER_URL=$renderUrl"
}

# ================= 3. VERCEL FRONTEND =================
if (-not $SkipVercel) {
  if (-not $renderUrl) { throw "No Render URL available. Run without -SkipRender first (or set RENDER_URL in .env)." }
  Write-Host "`n=== Deploying frontend to Vercel (API -> $renderUrl) ===" -ForegroundColor Cyan

  # point the frontend at the Render backend
  $vercelJson = Join-Path $root "frontend\vercel.json"
  @{
    rewrites = @(
      @{ source = "/(.*)"; destination = "/index.html" }
    )
  } | ConvertTo-Json -Depth 4 | Set-Content $vercelJson -Encoding UTF8
  Set-Content (Join-Path $root "frontend\.env.production") "VITE_API_URL=$renderUrl`n" -Encoding UTF8

  Push-Location (Join-Path $root "frontend")
  $env:VERCEL_TOKEN = $vercelToken
  vercel deploy --prod --yes --token $vercelToken 2>&1 | Out-Host
  Pop-Location

  Write-Host "`n=== DEPLOY COMPLETE ===" -ForegroundColor Green
  Write-Host "Frontend : https://arynox-hotel-management.vercel.app (or URL above)"
  Write-Host "Backend  : $renderUrl"
  Write-Host "Health   : $renderUrl/api/health"
}

Write-Host "Done."