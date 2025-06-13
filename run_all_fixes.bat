@echo off
echo Applying all CORS fixes and restarting the server...
echo.

echo Step 1: Fixing CORS configuration...
python fix_cors_step1.py
echo.

echo Step 2: Fixing after_request function...
python fix_cors_step2.py
echo.

echo Step 3: Removing explicit CORS headers...
python fix_cors_step3.py
echo.

echo Step 4: Updating imports and creating restart script...
python fix_cors_step4.py
echo.

echo All fixes have been applied. Restarting the server...
echo.

call restart_server.bat