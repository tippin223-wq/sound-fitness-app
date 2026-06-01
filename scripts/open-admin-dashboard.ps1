param(
  [int]$Port = 3000,
  [string]$DashboardPath = "/admin/dashboard"
)

$ErrorActionPreference = "Stop"

$Url = "http://localhost:$Port$DashboardPath"
$Launcher = Join-Path $PSScriptRoot "dev-admin.cmd"

function Test-UrlReady {
  param([string]$TargetUrl)

  try {
    $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2
    return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-UrlReady -TargetUrl $Url)) {
  Write-Host "Starting Next dev server on port $Port..."
  $startCommand = 'start "sound-fitness-dev" /min "' + $Launcher + '" ' + $Port
  & "$env:ComSpec" /d /c $startCommand
}

$deadline = (Get-Date).AddSeconds(45)
do {
  if (Test-UrlReady -TargetUrl $Url) {
    Write-Host "Admin dashboard ready: $Url"
    Write-Host "Open or refresh this URL in the Codex browser."
    exit 0
  }

  Start-Sleep -Milliseconds 750
} while ((Get-Date) -lt $deadline)

Write-Error "Timed out waiting for $Url. Check the sound-fitness-dev window for Next.js output."
exit 1
