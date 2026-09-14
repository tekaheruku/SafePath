<#
  start-defense-demo.ps1

  Brings up the full SafePath stack for a live demo: backend, frontend (pre-built
  production server), and the named Cloudflare tunnel on safepath.space.

  Usage:
    powershell -ExecutionPolicy Bypass -File start-defense-demo.ps1
    powershell -ExecutionPolicy Bypass -File start-defense-demo.ps1 -LocalOnly   # skip the tunnel (no internet needed)

  Requires: Postgres service running, Ollama running with llama3.2:3b + moondream
  pulled, and website/ already built (npm run build) with .env.local pointing at
  https://api.safepath.space. See DEFENSE_CHECKLIST.md.
#>

param(
  [switch]$LocalOnly
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "    FAILED: $msg" -ForegroundColor Red }

function Wait-ForHttp($url, $timeoutSeconds, $label) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        Write-Ok "$label is responding ($url)"
        return $true
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  Write-Fail "$label never responded at $url within $timeoutSeconds s"
  return $false
}

# --- 1. Preflight ---
Write-Step "Preflight checks"

$pg = Get-Service -Name 'postgresql-x64-18' -ErrorAction SilentlyContinue
if ($null -eq $pg) {
  Write-Fail "Postgres service 'postgresql-x64-18' not found. Is Postgres installed under a different service name?"
  exit 1
}
if ($pg.Status -ne 'Running') {
  Write-Host "    Postgres is not running, starting it..."
  Start-Service -Name 'postgresql-x64-18'
  Start-Sleep -Seconds 2
}
Write-Ok "Postgres service is running"

$ollamaReady = $false
for ($i = 0; $i -lt 10; $i++) {
  try {
    $tags = Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 3
    $names = $tags.models | ForEach-Object { $_.name }
    if (($names -match '^llama3\.2:3b') -and ($names -match '^moondream')) {
      $ollamaReady = $true
      break
    }
  } catch {}
  Start-Sleep -Seconds 2
}
if (-not $ollamaReady) {
  Write-Fail "Ollama isn't responding on :11434 with both models loaded."
  Write-Host "    Try launching it manually: & `"$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe`"" -ForegroundColor Yellow
  Write-Host "    Then re-run this script. (AI scoring will silently no-op without it - everything else still works.)" -ForegroundColor Yellow
} else {
  Write-Ok "Ollama is up with llama3.2:3b and moondream loaded"
}

# Free up 3001/3002 if a stale instance from a previous run is still around.
foreach ($port in 3001, 3002) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    Write-Host "    Port $port already in use by PID $($c.OwningProcess) - stopping it" -ForegroundColor Yellow
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

# --- 2. Backend ---
Write-Step "Starting backend (server/)"
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$RepoRoot\server'; Write-Host 'SafePath Backend' -ForegroundColor Cyan; npm run dev"
) -WindowStyle Normal

if (-not (Wait-ForHttp 'http://localhost:3001/health' 45 'Backend')) { exit 1 }

# --- 3. Frontend ---
Write-Step "Starting frontend (website/, pre-built production server)"
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$RepoRoot\website'; Write-Host 'SafePath Frontend' -ForegroundColor Cyan; npm run start -- -p 3002"
) -WindowStyle Normal

if (-not (Wait-ForHttp 'http://localhost:3002' 45 'Frontend')) { exit 1 }

# --- 4. Tunnel ---
if ($LocalOnly) {
  Write-Step "Skipping tunnel (-LocalOnly)"
} else {
  Write-Step "Starting named Cloudflare tunnel (safepath-defense)"

  $envPath = Join-Path $RepoRoot 'server\.env'
  $tokenLine = Get-Content $envPath | Where-Object { $_ -match '^CLOUDFLARE_TUNNEL_TOKEN=' }
  if (-not $tokenLine) {
    Write-Fail "CLOUDFLARE_TUNNEL_TOKEN not found in server\.env"
    exit 1
  }
  $token = $tokenLine -replace '^CLOUDFLARE_TUNNEL_TOKEN=', ''

  Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Write-Host 'SafePath Tunnel (safepath-defense)' -ForegroundColor Cyan; & 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel run --token $token"
  ) -WindowStyle Normal

  Wait-ForHttp 'https://api.safepath.space/health' 30 'Public backend (api.safepath.space)' | Out-Null
  Wait-ForHttp 'https://app.safepath.space' 30 'Public frontend (app.safepath.space)' | Out-Null
}

# --- 5. Summary ---
Write-Host "`n================ SafePath is up ================" -ForegroundColor Green
Write-Host " Local (show on this laptop):  http://localhost:3002"
if (-not $LocalOnly) {
  Write-Host " Public (give to panelists):   https://app.safepath.space"
  Write-Host " Public API:                   https://api.safepath.space"
  Write-Host "`n (Public URLs need this machine's internet connection - if there's no Wi-Fi, re-run with -LocalOnly)"
}
Write-Host "==================================================`n" -ForegroundColor Green
