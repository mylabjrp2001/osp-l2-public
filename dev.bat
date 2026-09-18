@echo off
rem DMP Monthly Report - developer mode on Windows. Double-click to start.
rem Web at http://localhost:5173 reloads on every code change; API on :8000 reloads too.
rem Use start.bat instead if you only want to use the app.
setlocal
title DMP Monthly Report - dev
set "PYTHONUTF8=1"
cd /d "%~dp0dmp-monthly-report" || goto :fail

call scripts\setup-windows.bat || goto :fail

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 240; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:8000/api/status | Out-Null; Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:5173/ | Out-Null; Start-Process 'http://localhost:5173/'; break } catch { Start-Sleep -Milliseconds 500 } }"

echo.
echo   Dev mode: web http://localhost:5173  -  API http://localhost:8000
echo   Edit files under dmp-monthly-report\src or server and the page updates by itself.
echo   Press Ctrl+C in this window to stop both.
echo.
call npm run dev:all
exit /b 0

:fail
echo.
echo Start-up did not finish. Read the message above, fix it, then double-click dev.bat again.
pause
exit /b 1
