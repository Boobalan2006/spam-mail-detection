from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, 
    origins=['http://localhost:3000', 'http://127.0.0.1:3000', 
             'http://localhost:4000', 'http://127.0.0.1:4000',
             'http://localhost:5000', 'http://127.0.0.1:5000',
             'http://localhost:5001', 'http://127.0.0.1:5001'],
    supports_credentials=True)

@app.route('/')
def home():
    return {'status': 'ok', 'message': 'Test server is running!'}

if __name__ == '__main__':
    print("Starting test server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True) 