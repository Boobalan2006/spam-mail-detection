"""
Step 2: Fix after_request function in app.py
This script modifies the after_request function to avoid duplicate CORS headers
"""

import os

# Read the file
app_path = "app.py"
with open(app_path, 'r') as file:
    content = file.read()

# Find and replace the after_request function
after_request_start = content.find("@app.after_request")
if after_request_start > -1:
    # Find the end of the function
    function_start = content.find("def after_request", after_request_start)
    next_def = content.find("def ", function_start + 1)
    
    if next_def == -1:  # If it's the last function
        next_def = content.find("if __name__ ==", function_start)
    
    if next_def > -1:
        # Extract the function
        after_request_function = content[after_request_start:next_def]
        
        # Create the new function
        new_function = """@app.after_request
def after_request(response):
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response.status_code = 200
    return response

"""
        # Replace the function
        content = content.replace(after_request_function, new_function)
        
        # Write the modified content back to the file
        with open(app_path, 'w') as file:
            file.write(content)
        
        print("Updated after_request function in app.py")
    else:
        print("Could not find the end of after_request function")
else:
    print("Could not find after_request function in app.py")

print("Step 2 completed. Run fix_cors_step3.py next.")