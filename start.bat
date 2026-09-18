@echo off
rem DMP Monthly Report - run the app on this Windows PC. Double-click to start.
rem First run installs everything it needs (a few minutes); later runs start in seconds.
rem Needs Python 3.12 and Node.js LTS installed. See README "Run on Windows".
setlocal
title DMP Monthly Report
set "PORT=8000"
set "PYTHONUTF8=1"
cd /d "%~dp0dmp-monthly-report" || goto :fail

rem Already running from an earlier double-click? Just open it again.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:%PORT%/api/status; if ($r.Content -match 'storage_dir') { exit 0 } else { exit 2 } } catch { exit 1 }"
if %errorlevel%==0 (
  echo DMP Monthly Report is already running - opening it in the browser.
  start "" "http://localhost:%PORT%/"
  exit /b 0
)
if %errorlevel%==2 (
  echo [X] Port %PORT% is used by another program. Close it, or change PORT at the top of start.bat.
  goto :fail
)

call scripts\setup-windows.bat || goto :fail

echo [start] Building the web app...
call npm run build -- --logLevel error
if errorlevel 1 (
  echo [X] Build failed - see the error above.
  goto :fail
)

rem Open the browser as soon as the server answers.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 120; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:%PORT%/api/status | Out-Null; Start-Process 'http://localhost:%PORT%/'; break } catch { Start-Sleep -Milliseconds 500 } }"

echo.
echo   DMP Monthly Report is running at http://localhost:%PORT%/
echo   Keep this window open while using it. Close the window to stop the app.
echo.
"%PYEXE%" -m uvicorn server.app:app --host 127.0.0.1 --port %PORT%
exit /b 0

:fail
echo.
echo Start-up did not finish. Read the message above, fix it, then double-click start.bat again.
pause
exit /b 1
