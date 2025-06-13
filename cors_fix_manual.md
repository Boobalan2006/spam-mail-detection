# Manual CORS Fix Instructions

If the automatic fix script doesn't work, you can manually fix the CORS issue by following these steps:

## Step 1: Edit app.py

Open `app.py` in a text editor and make the following changes:

### 1. Find the CORS configuration (near the beginning of the file)

```python
CORS(app, 
     resources={r"/*": {"origins": "*"}}, 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
     expose_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
```

### 2. Find the after_request function (near the end of the file)

Replace this function:

```python
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Access-Control-Allow-Credentials')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Expose-Headers', 'Content-Type,Authorization')
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response.status_code = 200
    return response
```

With this simplified version:

```python
@app.after_request
def after_request(response):
    # Don't add CORS headers here since they're handled by the Flask-CORS extension
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response.status_code = 200
    return response
```

### 3. Remove explicit CORS headers in specific routes

Look for code blocks like this in route functions:

```python
response.headers.add('Access-Control-Allow-Origin', '*')
response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
```

And replace them with:

```python
# CORS headers are handled by Flask-CORS extension
```

## Step 2: Restart the Flask Server

After making these changes, save the file and restart the Flask server:

1. Stop the current server (Ctrl+C in the terminal where it's running)
2. Start it again with `python app.py`

## Step 3: Test the Bulk Analysis Feature

Now try using the bulk analysis feature again in your browser.