"""
CORS Fix for Spam Detector Flask Application

This script modifies the app.py file to fix CORS headers issues.
Run this script to update the Flask application with proper CORS configuration.
"""

import re
import os
import shutil

# Backup the original file
app_path = "app.py"
backup_path = "app.py.bak"

if not os.path.exists(backup_path):
    print(f"Creating backup of {app_path} to {backup_path}")
    shutil.copy2(app_path, backup_path)
else:
    print(f"Backup already exists at {backup_path}")

# Read the original file
with open(app_path, 'r') as file:
    content = file.read()

# Fix the CORS configuration
cors_config_pattern = r"CORS\(app,\s*\n\s*resources=\{r\"\\/\*\": \{\"origins\": \"\*\"\}\},\s*\n\s*supports_credentials=True,\s*\n\s*allow_headers=\[.*?\],\s*\n\s*expose_headers=\[.*?\],\s*\n\s*methods=\[.*?\]\)"

cors_config_replacement = """CORS(app, 
     resources={r"/*": {"origins": "*"}}, 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     expose_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])"""

content = re.sub(cors_config_pattern, cors_config_replacement, content)

# Fix the after_request function
after_request_pattern = r"@app\.after_request\s*\ndef after_request\(response\):\s*\n\s*response\.headers\.add\('Access-Control-Allow-Origin', '\*'\)\s*\n\s*response\.headers\.add\('Access-Control-Allow-Headers', '.*?'\)\s*\n\s*response\.headers\.add\('Access-Control-Allow-Methods', '.*?'\)\s*\n\s*response\.headers\.add\('Access-Control-Expose-Headers', '.*?'\)\s*\n\s*# Handle preflight requests\s*\n\s*if request\.method == 'OPTIONS':\s*\n\s*response\.status_code = 200\s*\n\s*return response"

after_request_replacement = """@app.after_request
def after_request(response):
    # Don't add CORS headers here since they're handled by the Flask-CORS extension
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response.status_code = 200
    return response"""

content = re.sub(after_request_pattern, after_request_replacement, content)

# Fix explicit CORS headers in specific routes
explicit_cors_pattern = r"response\.headers\.add\('Access-Control-Allow-Origin', '\*'\)\s*\n\s*response\.headers\.add\('Access-Control-Allow-Headers', '.*?'\)\s*\n\s*response\.headers\.add\('Access-Control-Allow-Methods', '.*?'\)"
explicit_cors_replacement = "# CORS headers are handled by Flask-CORS extension"

content = re.sub(explicit_cors_pattern, explicit_cors_replacement, content)

# Write the modified content back to the file
with open(app_path, 'w') as file:
    file.write(content)

print(f"Updated {app_path} with fixed CORS configuration")
print("Please restart the Flask server for changes to take effect")