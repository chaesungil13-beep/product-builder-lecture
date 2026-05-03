param(
  [int]$DelaySeconds = 3
)

$ErrorActionPreference = "Stop"

function Invoke-AutoUpload {
  $status = git status --porcelain
  if (-not $status) {
    return
  }

  git add -A
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  git commit -m "Auto upload $timestamp"
  git push origin main
}

$root = (Get-Location).Path
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $root
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$ignoredPattern = "\\.git\\|auto-upload\.ps1$"
$pending = $false
$lastChange = Get-Date

$action = {
  if ($Event.SourceEventArgs.FullPath -match $ignoredPattern) {
    return
  }

  $script:pending = $true
  $script:lastChange = Get-Date
}

Register-ObjectEvent $watcher Changed -Action $action | Out-Null
Register-ObjectEvent $watcher Created -Action $action | Out-Null
Register-ObjectEvent $watcher Deleted -Action $action | Out-Null
Register-ObjectEvent $watcher Renamed -Action $action | Out-Null

Write-Host "Auto upload is running. Press Ctrl+C to stop."
Write-Host "Watching: $root"

while ($true) {
  Start-Sleep -Seconds 1

  if ($pending -and ((Get-Date) - $lastChange).TotalSeconds -ge $DelaySeconds) {
    $pending = $false
    try {
      Invoke-AutoUpload
      Write-Host "Uploaded changes."
    } catch {
      Write-Host "Auto upload failed: $($_.Exception.Message)"
    }
  }
}
