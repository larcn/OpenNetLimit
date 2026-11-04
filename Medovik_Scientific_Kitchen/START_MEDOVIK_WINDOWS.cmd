@echo off
setlocal
cd /d "%~dp0"
echo Starting Medovik Functional Review on 127.0.0.1 ...
echo Keep this window open while using the app. Press Ctrl+C to stop.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Start-Medovik.ps1"
if errorlevel 1 (
 echo.
 echo Local launch failed. Review START_HERE_FUNCTIONAL_AR.md.
 pause
)
