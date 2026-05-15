$root = $PSScriptRoot
Set-Location -LiteralPath $root; pnpm install
if ($?) {
  Set-Location (Join-Path $root "apps/ai"); uv sync
  Set-Location $root
}
