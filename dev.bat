@echo off
rem DMP Monthly Report (OSP L2) - developer mode. Double-click to start.
rem Web at http://localhost:5173 reloads whenever you edit a file; API on :8000.
rem Use start.bat instead if you only want to use the app.
setlocal
title OSP L2 - dev mode
set "PYTHONUTF8=1"

set "PS=powershell"
where pwsh >nul 2>nul && set "PS=pwsh"
%PS% -NoProfile -ExecutionPolicy Bypass -File "%~dp0dmp-monthly-report\scripts\start-windows.ps1" -Dev
if errorlevel 9009 goto :fallback
exit /b 0

rem ---------------------------------------------------------------------------
:fallback
echo.
echo   PowerShell is unavailable - running in plain mode.
echo.
cd /d "%~dp0dmp-monthly-report" || goto :fail
call scripts\setup-windows.bat || goto :fail
echo.
echo   Dev mode: web http://localhost:5173  -  API http://localhost:8000
echo   KEEP THIS WINDOW OPEN. Press Ctrl+C to stop.
echo.
call npm run dev:all
echo.
echo   Dev mode stopped.
pause
exit /b 0

:fail
echo.
echo   Start-up did not finish. Read the message above, fix it, then run dev.bat again.
pause
exit /b 1
