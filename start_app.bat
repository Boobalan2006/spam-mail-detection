@echo off
echo Starting Spam Detector Application...
echo.
echo Step 1: Starting the Flask backend server...
start cmd /k "cd /d %~dp0 && python app.py"
echo.
echo Step 2: Waiting for backend to initialize (10 seconds)...
timeout /t 10 /nobreak > nul
echo.
echo Step 3: Starting the Next.js frontend...
start cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo Both servers should now be starting!
echo.
echo - Backend will be available at: http://localhost:5000
echo - Frontend will be available at: http://localhost:3000
echo.
echo You can close this window, but keep the other command windows open.
echo.