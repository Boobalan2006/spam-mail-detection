<<<<<<< HEAD
# Spam Detector Application
=======
# Spam Detector
>>>>>>> fe4eca827b679bc16513e78686e4db7531151f85

This application provides email spam detection capabilities with both single email analysis and bulk analysis features.

## Architecture

The application consists of two main components:

1. **Frontend**: A Next.js application that provides the user interface
2. **Backend**: A Flask server that handles the spam detection logic and API endpoints

## Getting Started

### Prerequisites

- Python 3.7+ with pip
- Node.js and npm

### Installation

1. Install Python dependencies:
   ```
   pip install flask flask-cors flask-jwt-extended pandas scikit-learn matplotlib seaborn
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

### Starting the Application

#### Option 1: Using the start script

Run the `start_app.bat` file by double-clicking it. This will:
- Start the Flask backend server on port 5000
- Wait for the backend to initialize
- Start the Next.js frontend on port 3000

#### Option 2: Manual startup

1. Start the Flask backend:
   ```
   python app.py
   ```

2. In a separate terminal, start the Next.js frontend:
   ```
   npm run dev
   ```

## Using the Application

1. Open your browser and navigate to http://localhost:3000
2. You can analyze individual emails or upload files for bulk analysis
3. For bulk analysis, you can upload .txt files (one email per line) or .csv files

## Troubleshooting

### "TypeError: Failed to fetch" Error

This error occurs when the frontend cannot connect to the backend server. To fix:

1. Make sure the Flask backend is running on port 5000
2. Check if there are any error messages in the terminal where the backend is running
3. Ensure your firewall is not blocking the connection
4. Try restarting both servers

### Individual Email Analysis Works But Bulk Analysis Doesn't

The individual email analysis uses client-side processing when the server is unavailable, while bulk analysis requires the backend server. Make sure:

1. The Flask server is running
2. You're logged in (bulk analysis requires authentication)
3. The file format is correct (.txt with one email per line or .csv)

## How It Works

- **Individual Email Analysis**: The application can analyze emails using both client-side JavaScript and the backend API
- **Bulk Analysis**: For analyzing multiple emails at once, the application uses the backend API for processing and visualization generation

## Development

<<<<<<< HEAD
- Frontend code is in the `components` directory
- Backend code is in `app.py` and the `spam-detection-backend` directory
- Models are stored as pickle files in the root directory
=======
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Building for Production

```bash
# Build the frontend
npm run build
```
>>>>>>> fe4eca827b679bc16513e78686e4db7531151f85
