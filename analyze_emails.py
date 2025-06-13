import requests
import json

# First, get a token by logging in
login_data = {
    "email": "demo@example.com",
    "password": "password123"
}

# Login to get a token
login_response = requests.post('http://localhost:5001/login', json=login_data)
if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

# Extract the token
token = login_response.json().get('access_token')
headers = {
    'Authorization': f'Bearer {token}'
}

# Read the emails from file
with open('emails.txt', 'r') as f:
    emails = f.read()

# Create a file object for the request
files = {'file': ('emails.txt', emails)}

# Make the API call with the authorization header
response = requests.post('http://localhost:5001/bulk-analyze', files=files, headers=headers)

# Print the response
print(json.dumps(response.json(), indent=2))

# Save the batch ID for later use
batch_id = response.json().get('batch_id')
print(f"Batch ID: {batch_id}")
print(f"Access visualizations at: http://localhost:5001/visualizations")
print(f"Enter the batch ID: {batch_id}")