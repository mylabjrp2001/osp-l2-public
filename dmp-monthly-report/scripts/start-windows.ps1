# OSP L2 launcher for Windows. Called by start.bat (normal) and dev.bat (-Dev).
# Draws the banner, runs the shared setup, then keeps the console open streaming
# the server log — the window must never vanish, or a first-time user has no idea
# whether the app is running or how to stop it.
param([switch]$Dev)

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
try { $Host.UI.RawUI.WindowTitle = 'OSP L2 - DMP Monthly Report' } catch {}

$root = Split-Path -Parent $PSScriptRoot          # dmp-monthly-report\
Set-Location $root

$Port = if ($env:OSP_PORT) { $env:OSP_PORT } else { 8000 }
$WebPort = if ($Dev) { 5173 } else { $Port }
$Url = "http://localhost:$WebPort/"

function Show-Banner {
    Clear-Host
    $c = 'Cyan'; $m = 'Magenta'; $d = 'DarkGray'
    Write-Host ''
    Write-Host '  ┌──────────────────────────────────────────────────────────────┐' -ForegroundColor $d
    Write-Host '  │                                                              │' -ForegroundColor $d
    $art = @(
        ' ██████╗ ███████╗██████╗      ██╗     ██████╗ ',
        '██╔═══██╗██╔════╝██╔══██╗     ██║     ╚════██╗',
        '██║   ██║███████╗██████╔╝     ██║      █████╔╝',
        '██║   ██║╚════██║██╔═══╝      ██║     ██╔═══╝ ',
        '╚██████╔╝███████║██║          ███████╗███████╗',
        ' ╚═════╝ ╚══════╝╚═╝          ╚══════╝╚══════╝'
    )
    foreach ($row in $art) {
        Write-Host '  │   ' -ForegroundColor $d -NoNewline
        Write-Host $row -ForegroundColor $c -NoNewline
        Write-Host '             │' -ForegroundColor $d
    }
    Write-Host '  │                                                              │' -ForegroundColor $d
    Write-Host '  │        ' -ForegroundColor $d -NoNewline
    Write-Host 'DMP Advance Solution Network (BKK)' -ForegroundColor $m -NoNewline
    Write-Host '                    │' -ForegroundColor $d
    Write-Host '  │        ' -ForegroundColor $d -NoNewline
    Write-Host 'Monthly Report  ·  Team Performance' -ForegroundColor White -NoNewline
    Write-Host '                   │' -ForegroundColor $d
    Write-Host '  │                                                              │' -ForegroundColor $d
    Write-Host '  └──────────────────────────────────────────────────────────────┘' -ForegroundColor $d
    Write-Host ''
}

function Write-Status([string]$label, [string]$value, [string]$color = 'Green') {
    Write-Host '  * ' -ForegroundColor $color -NoNewline
    Write-Host ($label.PadRight(10)) -ForegroundColor Gray -NoNewline
    Write-Host $value -ForegroundColor White
}

function Write-Step([string]$text) {
    Write-Host '  > ' -ForegroundColor DarkCyan -NoNewline
    Write-Host $text -ForegroundColor Gray
}

function Write-Rule([string]$title) {
    Write-Host ''
    Write-Host ('  ── ' + $title + ' ' + ('─' * [Math]::Max(0, 58 - $title.Length))) -ForegroundColor DarkGray
    Write-Host ''
}

function Get-DataInfo {
    # data.json starts with its summary keys, so the first bytes are enough — the
    # file itself is ~30 MB and must not be parsed here.
    $path = Join-Path $root 'server\storage\data.json'
    if (-not (Test-Path $path)) { return $null }
    $fs = [IO.File]::OpenRead($path)
    try {
        $buf = New-Object byte[] 400
        $n = $fs.Read($buf, 0, 400)
        $head = [Text.Encoding]::UTF8.GetString($buf, 0, $n)
    } finally { $fs.Close() }
    $total = [regex]::Match($head, '"total":(\d+)').Groups[1].Value
    $min = [regex]::Match($head, '"date_min":"([^"]+)"').Groups[1].Value
    $max = [regex]::Match($head, '"date_max":"([^"]+)"').Groups[1].Value
    if (-not $total) { return $null }
    return ('{0:N0} jobs  ·  {1} → {2}' -f [int]$total, $min, $max)
}

function Stop-Here([string]$message) {
    Write-Host ''
    Write-Host '  !  ' -ForegroundColor Red -NoNewline
    Write-Host $message -ForegroundColor White
    Write-Host ''
    Write-Host '  Fix the problem above, then run this file again.' -ForegroundColor DarkGray
    Write-Host ''
    Read-Host '  Press Enter to close this window'
    exit 1
}

Show-Banner

# ---- already running? -------------------------------------------------------
if (-not $Dev) {
    try {
        $probe = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$Port/api/status"
        if ($probe.Content -match 'storage_dir') {
            Write-Status 'Running' "already started at $Url" 'Yellow'
            Start-Process $Url
            Write-Host ''
            Write-Host '  The app was already running, so the browser just opened again.' -ForegroundColor DarkGray
            Write-Host '  Its log lives in the other window - close that one to stop the app.' -ForegroundColor DarkGray
            Write-Host ''
            Read-Host '  Press Enter to close this window'
            exit 0
        }
        Stop-Here "Port $Port is used by another program. Close it, or set OSP_PORT to another number."
    } catch {}
}

# ---- setup (installs only what is missing) ----------------------------------
Write-Rule 'Preparing'
Write-Step 'Checking Python, Node.js, packages and report data...'
Write-Host ''
$setup = Join-Path $PSScriptRoot 'setup-windows.bat'
& cmd.exe /c $setup
if ($LASTEXITCODE -ne 0) { Stop-Here 'Setup did not finish - see the message above.' }

$python = Join-Path $root 'server\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { Stop-Here "Python environment is missing at $python" }

if (-not $Dev) {
    Write-Step 'Building the web app...'
    & cmd.exe /c 'npm run build -- --logLevel error'
    if ($LASTEXITCODE -ne 0) { Stop-Here 'Build failed - see the message above.' }
}

# ---- status -----------------------------------------------------------------
Show-Banner
$pyVersion = (& $python --version 2>&1) -replace 'Python ', ''
$nodeVersion = (& cmd.exe /c 'node --version') -replace 'v', ''
Write-Status 'Python' $pyVersion
Write-Status 'Node' $nodeVersion
$data = Get-DataInfo
if ($data) { Write-Status 'Data' $data } else { Write-Status 'Data' 'empty - upload an Excel file in the web page' 'Yellow' }
Write-Status 'Mode' $(if ($Dev) { 'developer - the page reloads when you edit a file' } else { 'normal' })
Write-Status 'Address' $Url 'Cyan'
Write-Host ''
Write-Host '  ┌──────────────────────────────────────────────────────────────┐' -ForegroundColor DarkGray
Write-Host '  │  ' -ForegroundColor DarkGray -NoNewline
Write-Host 'KEEP THIS WINDOW OPEN while you use the report.' -ForegroundColor Yellow -NoNewline
Write-Host '             │' -ForegroundColor DarkGray
Write-Host '  │  ' -ForegroundColor DarkGray -NoNewline
Write-Host 'Closing it - or pressing Ctrl+C - stops the app.' -ForegroundColor Gray -NoNewline
Write-Host '            │' -ForegroundColor DarkGray
Write-Host '  └──────────────────────────────────────────────────────────────┘' -ForegroundColor DarkGray

# ---- open the browser once the server answers -------------------------------
Start-Job -ScriptBlock {
    param($u, $probeUrl)
    for ($i = 0; $i -lt 240; $i++) {
        try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $probeUrl | Out-Null; Start-Process $u; break }
        catch { Start-Sleep -Milliseconds 500 }
    }
} -ArgumentList $Url, $(if ($Dev) { $Url } else { "http://127.0.0.1:$Port/api/status" }) | Out-Null

Write-Rule 'Server log'

try {
    if ($Dev) {
        & cmd.exe /c 'npm run dev:all'
    } else {
        & $python -m uvicorn server.app:app --host 127.0.0.1 --port $Port
    }
} finally {
    Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue
    Write-Host ''
    Write-Rule 'Stopped'
    Write-Host '  The app is no longer running. Double-click the file again to start it.' -ForegroundColor Gray
    Write-Host ''
    Read-Host '  Press Enter to close this window'
}
