"""
Step 1: Fix CORS configuration in app.py
This script modifies the CORS configuration in app.py
"""

import os
import shutil

# Backup the original file if not already backed up
app_path = "app.py"
backup_path = "app.py.bak"

if not os.path.exists(backup_path):
    print(f"Creating backup of {app_path} to {backup_path}")
    shutil.copy2(app_path, backup_path)
else:
    print(f"Backup already exists at {backup_path}")

# Read the original file
with open(app_path, 'r') as file:
    lines = file.readlines()

# Find and modify the CORS configuration
cors_start = -1
cors_end = -1

for i, line in enumerate(lines):
    if "CORS(app" in line:
        cors_start = i
    if cors_start > -1 and ")" in line and cors_end == -1:
        cors_end = i

if cors_start > -1 and cors_end > -1:
    # Replace the CORS configuration
    new_cors_config = [
        "CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.92.33:3000'],\n",
        "     supports_credentials=True,\n",
        "     allow_headers=['Content-Type', 'Authorization'],\n",
        "     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])\n"
    ]
    
    lines[cors_start:cors_end+1] = new_cors_config
    
    # Write the modified content back to the file
    with open(app_path, 'w') as file:
        file.writelines(lines)
    
    print("Updated CORS configuration in app.py")
else:
    print("Could not find CORS configuration in app.py")

print("Step 1 completed. Run fix_cors_step2.py next.")