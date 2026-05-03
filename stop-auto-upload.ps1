$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$pidPath = Join-Path $root ".auto-upload.pid"

if (-not (Test-Path $pidPath)) {
  Write-Host "Auto upload is not running."
  exit 0
}

$pidValue = Get-Content -Raw -Path $pidPath
$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue

if ($process) {
  Stop-Process -Id $pidValue
  Write-Host "Auto upload stopped. PID: $pidValue"
} else {
  Write-Host "Auto upload process was not found."
}

Remove-Item -Path $pidPath -Force
