@echo off
title BLE Monitor Server
:: Ensure we are in the script's directory
cd /d "%~dp0"

:start
cls
echo ========================================================
echo   BLE Monitor Dashboard
echo   http://localhost:8000
echo ========================================================
echo.
echo   [INSTRUCTIONS]
echo   1. Keep this window open.
echo   2. Edit your files (index.html, js/*.js) and SAVE.
echo   3. Refresh your Chrome tab to see changes.
echo.
echo   * You do NOT need to restart this window to see updates. *
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Python is not found in your PATH.
    echo   Please install Python or add it to your environment variables.
    pause
    exit /b
)

:: Run the server
echo   Starting server...
python -m http.server 8000

:: If the server stops (e.g., you press Ctrl+C), we pause here instead of closing
echo.
echo   [STOPPED] The server process has ended.
echo   Press any key to restart the server...
pause >nul
goto start