@echo off
echo Restarting Flask server with updated CORS configuration...
echo.

echo Step 1: Stopping any running Flask servers...
taskkill /f /im python.exe /fi "WINDOWTITLE eq Flask*" > nul 2>&1
timeout /t 2 /nobreak > nul

echo Step 2: Starting Flask server with new configuration...
start cmd /k "python app.py"

echo.
echo Server has been restarted with the new CORS configuration.
echo Please try the bulk analysis feature again in your browser.
echo If you still experience issues, try:
echo 1. Clearing your browser cache
echo 2. Ensuring you're accessing the frontend via http://localhost:3000
echo 3. Checking the browser console for any specific error messages
echo.