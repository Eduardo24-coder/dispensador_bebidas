# Publish a preview using the local deployment tools prepared by Codex.
$ErrorActionPreference = 'Stop'
$toolRoot = Join-Path $env:LOCALAPPDATA 'Codex\deployment-tools'
$nodeDirectory = Get-ChildItem -LiteralPath $toolRoot -Directory -Filter 'node-*-win-x64' |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'node.exe') } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $nodeDirectory) { throw 'No se encontraron las herramientas locales de Node.js.' }
$nodeExecutable = Join-Path $nodeDirectory.FullName 'node.exe'
$vercelEntry = Join-Path $toolRoot 'vercel-cli\node_modules\vercel\dist\index.js'
if (-not (Test-Path -LiteralPath $vercelEntry)) { throw 'La instalacion de Vercel CLI aun no esta completa.' }
$env:PATH = $nodeDirectory.FullName + ';' + $env:PATH
Push-Location -LiteralPath $PSScriptRoot
try {
    & $nodeExecutable $vercelEntry whoami
    if ($LASTEXITCODE -ne 0) {
        & $nodeExecutable $vercelEntry login
        if ($LASTEXITCODE -ne 0) { throw 'No se completo el inicio de sesion en Vercel.' }
    }
    # Dedicated demo project. Vercel can classify a new project's first deploy
    # as production; subsequent deploys without --prod create previews.
    & $nodeExecutable $vercelEntry deploy --yes
    if ($LASTEXITCODE -ne 0) { throw 'Vercel no pudo completar el despliegue.' }
} finally {
    Pop-Location
}
