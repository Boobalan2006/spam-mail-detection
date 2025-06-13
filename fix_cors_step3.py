"""
Step 3: Remove explicit CORS headers from route handlers in app.py
This script removes explicit CORS headers from individual route handlers
"""

import os
import re

# Read the file
app_path = "app.py"
with open(app_path, 'r') as file:
    content = file.read()

# Find and remove explicit CORS headers in route handlers
pattern = r"response\.headers\.add\('Access-Control-Allow-Origin', '.*?'\)\s*\n\s*response\.headers\.add\('Access-Control-Allow-Headers', '.*?'\)\s*\n\s*response\.headers\.add\('Access-Control-Allow-Methods', '.*?'\)"

replacement = "# CORS headers are handled by Flask-CORS extension"

modified_content = re.sub(pattern, replacement, content)

# Write the modified content back to the file
with open(app_path, 'w') as file:
    file.write(modified_content)

print("Removed explicit CORS headers from route handlers in app.py")
print("Step 3 completed. Run fix_cors_step4.py next.")