# Builds a self-contained portable Windows app in dist-win\MediaScraper\:
#   MediaScraper.exe   launcher — starts the server, opens the browser
#   node\node.exe      bundled Node runtime (nothing to install on the target PC)
#   server\            API + production node_modules (incl. yt-dlp, ffmpeg, sharp)
#   client\dist\       built frontend, served by the server on port 5175
#
# Usage:  npm run package:win     (or:  powershell -ExecutionPolicy Bypass -File scripts\package-win.ps1)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'dist-win\MediaScraper'

Write-Host '[1/6] Building the client...'
Push-Location $root
npm run build -w client
$ok = $LASTEXITCODE -eq 0
Pop-Location
if (-not $ok) { throw 'Client build failed.' }

Write-Host '[2/6] Laying out the package folder...'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force "$out\server\lib" | Out-Null
New-Item -ItemType Directory -Force "$out\client" | Out-Null
New-Item -ItemType Directory -Force "$out\node" | Out-Null
Copy-Item "$root\server\index.js" "$out\server\"
Copy-Item "$root\server\package.json" "$out\server\"
Copy-Item "$root\server\lib\*" "$out\server\lib\"
Copy-Item "$root\client\dist" "$out\client\dist" -Recurse

Write-Host '[3/6] Installing production server dependencies (downloads yt-dlp + ffmpeg)...'
Push-Location "$out\server"
npm install --omit=dev --no-audit --no-fund --no-package-lock
$ok = $LASTEXITCODE -eq 0
Pop-Location
if (-not $ok) { throw 'Server dependency install failed.' }

Write-Host '[4/6] Bundling the Node runtime...'
Copy-Item (Get-Command node).Source "$out\node\node.exe"

Write-Host '[5/6] Compiling MediaScraper.exe...'
$csc = Get-ChildItem "$env:windir\Microsoft.NET\Framework64\v4*\csc.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1
if (-not $csc) {
  $csc = Get-ChildItem "$env:windir\Microsoft.NET\Framework\v4*\csc.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
}
if (-not $csc) { throw 'No .NET Framework C# compiler found (csc.exe).' }
& $csc.FullName /nologo /optimize /target:exe /out:"$out\MediaScraper.exe" "$PSScriptRoot\launcher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Launcher compile failed.' }

Write-Host '[6/6] Writing package README...'
@'
Media Scraper — portable Windows build
======================================

Run:  double-click MediaScraper.exe

A console window opens with the server logs and your browser opens
http://localhost:5175. Close the console window to stop the app.

Everything is self-contained: Node, yt-dlp, and ffmpeg are bundled.
You can move or copy this whole folder anywhere, including to another
Windows PC — nothing needs to be installed.

Private / age-restricted posts: export browser cookies (Netscape format)
to a file named cookies.txt inside the server\ folder.
'@ | Out-File "$out\README.txt" -Encoding utf8

$size = '{0:N0} MB' -f ((Get-ChildItem $out -Recurse | Measure-Object Length -Sum).Sum / 1MB)
Write-Host ''
Write-Host "Done: $out ($size)"
