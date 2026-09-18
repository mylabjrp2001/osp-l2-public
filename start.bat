@echo off
rem DMP Monthly Report (OSP L2) - double-click to run the app on this PC.
rem First run installs what it needs (a few minutes); later runs start in seconds.
rem Needs Python 3.12 and Node.js LTS. See README "ติดตั้งและใช้งานบน Windows".
rem
rem To use another port, remove the "rem" below and change the number.
rem set "OSP_PORT=8010"
setlocal
title OSP L2 - DMP Monthly Report
if not defined OSP_PORT set "OSP_PORT=8000"
set "PYTHONUTF8=1"

set "PS=powershell"
where pwsh >nul 2>nul && set "PS=pwsh"
%PS% -NoProfile -ExecutionPolicy Bypass -File "%~dp0dmp-monthly-report\scripts\start-windows.ps1"
if errorlevel 9009 goto :fallback
exit /b 0

rem ---------------------------------------------------------------------------
rem Plain fallback for machines where PowerShell cannot run scripts at all.
:fallback
echo.
echo   PowerShell is unavailable - running in plain mode.
echo.
cd /d "%~dp0dmp-monthly-report" || goto :fail
call scripts\setup-windows.bat || goto :fail
call npm run build -- --logLevel error || goto :fail
echo.
echo   DMP Monthly Report is running at http://localhost:%OSP_PORT%/
echo   KEEP THIS WINDOW OPEN. Closing it stops the app.
echo.
start "" "http://localhost:%OSP_PORT%/"
"%CD%\server\.venv\Scripts\python.exe" -m uvicorn server.app:app --host 127.0.0.1 --port %OSP_PORT%
echo.
echo   The app is no longer running.
pause
exit /b 0

:fail
echo.
echo   Start-up did not finish. Read the message above, fix it, then run start.bat again.
pause
exit /b 1
