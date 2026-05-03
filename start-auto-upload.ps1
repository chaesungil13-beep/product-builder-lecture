$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$pidPath = Join-Path $root ".auto-upload.pid"
$logPath = Join-Path $root "auto-upload.log"

if (Test-Path $pidPath) {
  $oldPid = Get-Content -Raw -Path $pidPath
  $process = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Auto upload is already running. PID: $oldPid"
    exit 0
  }
}

$process = Start-Process powershell `
  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$root\auto-upload.ps1`"" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logPath `
  -RedirectStandardError $logPath `
  -PassThru

Set-Content -Path $pidPath -Value $process.Id
Write-Host "Auto upload started. PID: $($process.Id)"
Write-Host "Log: $logPath"
