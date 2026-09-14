<#
  close-defense-demo.ps1

  Closes the backend, frontend, and named Cloudflare tunnel started by
  start-defense-demo.ps1, freeing ports 3001/3002.
#>

function Stop-ByPort($port) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    Write-Host "Stopping process on port $port (PID $($c.OwningProcess))"
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Stopping backend (port 3001)..."
Stop-ByPort 3001

Write-Host "Stopping frontend (port 3002)..."
Stop-ByPort 3002

Write-Host "Stopping cloudflared tunnel..."
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "`nDone. Ports 3001/3002 freed and tunnel stopped." -ForegroundColor Green
