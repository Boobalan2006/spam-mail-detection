"""
Step 4: Update the Flask-CORS import and restart the server
This script updates the Flask-CORS import statement and creates a restart script
"""

import os

# Read the file
app_path = "app.py"
with open(app_path, 'r') as file:
    content = file.read()

# Update the Flask-CORS import if needed
old_import = "from flask_cors import CORS"
new_import = "from flask_cors import CORS"

if old_import in content:
    # The import is already correct, no need to change
    pass
else:
    # Find the imports section and add the correct import
    import_section_end = content.find("\napp = Flask(__name__)")
    if import_section_end > -1:
        updated_content = content[:import_section_end] + "\n" + new_import + content[import_section_end:]
        
        # Write the modified content back to the file
        with open(app_path, 'w') as file:
            file.write(updated_content)
        
        print("Updated Flask-CORS import in app.py")

# Create a restart script
restart_script = """@echo off
echo Restarting Flask server with fixed CORS configuration...
echo.

echo Step 1: Stopping any running Flask servers...
taskkill /f /im python.exe /fi "WINDOWTITLE eq *app.py*" > nul 2>&1
timeout /t 2 /nobreak > nul
echo.

echo Step 2: Starting Flask server with fixed CORS configuration...
start cmd /k "python app.py"
echo.

echo Server should now be running with fixed CORS configuration!
echo Please try the bulk analysis feature again in your browser.
echo."""

with open("restart_server.bat", 'w') as file:
    file.write(restart_script)

print("Created restart_server.bat script")
print("All CORS fixes have been applied.")
print("Run restart_server.bat to restart the Flask server with the new configuration.")