@echo off
rem Shared setup for start.bat and dev.bat on Windows. Safe to run every time:
rem each step is skipped when it is already done.
rem
rem Expects the current directory to be dmp-monthly-report\.
rem On success sets PYEXE (the venv python) and returns 0; on failure prints why
rem and returns 1. Deliberately no setlocal, so PYEXE reaches the caller.
rem Messages are ASCII on purpose: Thai text in .bat files depends on the console
rem code page and often prints as garbage.

rem ---- Python -----------------------------------------------------------------
rem Prefer the "py" launcher: on a fresh Windows, "python" can be the Microsoft
rem Store stub, which opens the Store instead of running anything.
set "PY="
py -3 --version >nul 2>nul
if not errorlevel 1 set "PY=py -3"
if not defined PY (
  python --version >nul 2>nul
  if not errorlevel 1 set "PY=python"
)
if not defined PY (
  echo.
  echo [X] Python 3 was not found.
  echo     Install Python 3.12 from https://www.python.org/downloads/windows/
  echo     and tick "Add python.exe to PATH" in the installer, then run this again.
  start "" "https://www.python.org/downloads/windows/"
  exit /b 1
)

rem ---- Node.js ----------------------------------------------------------------
node --version >nul 2>nul
if errorlevel 1 (
  echo.
  echo [X] Node.js was not found.
  echo     Install the LTS version from https://nodejs.org/ then run this again.
  start "" "https://nodejs.org/"
  exit /b 1
)

rem ---- Python packages ----------------------------------------------------------
if not exist "server\.venv\Scripts\python.exe" (
  echo [setup] Creating the Python environment...
  %PY% -m venv server\.venv
  if errorlevel 1 (
    echo [X] Could not create server\.venv
    exit /b 1
  )
)
set "PYEXE=%CD%\server\.venv\Scripts\python.exe"

echo [setup] Checking Python packages...
"%PYEXE%" -m pip install --disable-pip-version-check -q -r server\requirements.txt
if errorlevel 1 (
  echo [X] pip install failed - check the internet connection and run this again.
  exit /b 1
)

rem ---- Web packages -------------------------------------------------------------
rem Reinstall only when package-lock.json differs from the copy saved after the
rem last successful install.
fc /b package-lock.json node_modules\.dmp-lock >nul 2>nul
if errorlevel 1 (
  echo [setup] Installing web packages - the first run takes a few minutes...
  call npm ci
  if errorlevel 1 (
    echo [X] npm ci failed - check the internet connection and run this again.
    exit /b 1
  )
  copy /y package-lock.json node_modules\.dmp-lock >nul
)

rem ---- Report data -----------------------------------------------------------------
rem The repo ships the Excel files from the day it was handed over in "..\Excel Data".
rem They are copied once; after that, newer files come from the Upload Excel button.
if not exist "server\storage\excel" mkdir "server\storage\excel"
if not exist "server\storage\excel\Data Job done *.xls*" (
  if exist "..\Excel Data\Data Job done *.xls*" (
    echo [setup] Copying the bundled Excel data...
    copy /y "..\Excel Data\Data Job done *.xls*" "server\storage\excel\" >nul
  )
)
if not exist "server\storage\data.json" (
  if exist "server\storage\excel\Data Job done *.xls*" (
    echo [setup] Building report data from Excel - about 15 seconds...
    "%PYEXE%" -m server.etl >nul
    if errorlevel 1 (
      echo [X] Could not build data.json from the Excel files.
      exit /b 1
    )
  )
)

exit /b 0
