@echo off
rem DMP Monthly Report (OSP L2) - double-click to stop the app.
rem Use this when the window it was running in is gone or cannot be found.
rem It only stops this report's own server; any other program using the port is left alone.
setlocal
title OSP L2 - stop
if not defined OSP_PORT set "OSP_PORT=8000"

set "PS=powershell"
where pwsh >nul 2>nul && set "PS=pwsh"
%PS% -NoProfile -ExecutionPolicy Bypass -File "%~dp0dmp-monthly-report\scripts\start-windows.ps1" -Stop
if errorlevel 9009 goto :fallback
exit /b 0

rem ---------------------------------------------------------------------------
rem Plain fallback for machines where PowerShell cannot run scripts at all.
:fallback
echo.
echo   Stopping the report server on port %OSP_PORT% ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%OSP_PORT% .*LISTENING"') do (
  for /f "tokens=1" %%n in ('tasklist /fi "PID eq %%p" /nh ^| findstr /i "python node"') do (
    echo   Stopping %%n  PID %%p
    taskkill /PID %%p /T /F >nul
  )
)
echo.
echo   Done. Double-click start.bat when you want the report back.
pause
exit /b 0
