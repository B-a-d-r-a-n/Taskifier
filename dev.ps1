$root = $PSScriptRoot

$jobs = @()

$jobs += Start-Job -Name "mobile" -ScriptBlock {
  param($dir)

  $pid8081 = netstat -ano | Select-String ":8081 " | ForEach-Object {
    ($_ -split '\s+')[-1]
  } | Select-Object -First 1

  if ($pid8081) {
    Stop-Process -Id $pid8081 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }

  $env:CI = "1"
  Set-Location (Join-Path $dir "apps/Taskifier")
  npx expo start -c --port 8081 --web 2>&1
} -ArgumentList $root

$jobs += Start-Job -Name "backend" -ScriptBlock {
  param($dir)
  Set-Location (Join-Path $dir "apps/server")
  pnpm run dev 2>&1
} -ArgumentList $root

$jobs += Start-Job -Name "ai" -ScriptBlock {
  param($dir)
  Set-Location (Join-Path $dir "apps/ai")
  uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001 2>&1
} -ArgumentList $root

Write-Host "All dev processes started. Press Ctrl+C to stop."

try {
  while ($true) {
    $jobs | ForEach-Object {
      $name = $_.Name
      Receive-Job $_ | ForEach-Object {
        Write-Host "[$name] $_"
      }
    }
    Start-Sleep -Milliseconds 500
  }
} finally {
  Write-Host "`nStopping all jobs..."
  $jobs | Stop-Job
  $jobs | Remove-Job
}