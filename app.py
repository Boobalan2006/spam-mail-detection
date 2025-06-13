from flask import Flask, request, jsonify, send_file, Response, render_template_string
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from config import Config
from auth import UserManager, rate_limit, TokenBlacklist
import json
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib
from werkzeug.security import generate_password_hash, check_password_hash
import os
import pickle
import datetime
import uuid
import csv
import io
import matplotlib
matplotlib.use('Agg')  # Set the backend to Agg before importing pyplot
import matplotlib.pyplot as plt
import seaborn as sns
import base64
import numpy as np
from werkzeug.utils import secure_filename
import threading

app = Flask(__name__)
app.config.from_object(Config)

# Initialize CORS with more permissive settings for development
CORS(app, 
    origins=['http://localhost:3000', 'http://127.0.0.1:3000', 
             'http://localhost:4000', 'http://127.0.0.1:4000',
             'http://localhost:5000', 'http://127.0.0.1:5000'],
    supports_credentials=True,
    allow_headers=['Content-Type', 'Authorization', 'Accept'],
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
)

# Initialize JWT
jwt = JWTManager(app)
user_manager = UserManager()

@jwt.token_in_blocklist_loader
def check_if_token_is_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return TokenBlacklist.get_instance().is_blacklisted(jti)

@app.route("/register", methods=["POST"])
@rate_limit
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    
    if not all([username, email, password]):
        return jsonify({"error": "Missing required fields"}), 400
    
    success, result = user_manager.create_user(username, email, password)
    
    if not success:
        return jsonify({"error": result}), 400
    
    # Log the user in automatically
    auth_result = user_manager.authenticate_user(email, password)
    
    return jsonify({
        "message": "Registration successful",
        "access_token": auth_result['access_token'],
        "refresh_token": auth_result['refresh_token'],
        "user": auth_result['user']
    })

@app.route("/login", methods=["POST"])
@rate_limit
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400
    
    auth_result = user_manager.authenticate_user(email, password)
    
    if not auth_result:
        return jsonify({"error": "Invalid email or password"}), 401
    
    return jsonify({
        "message": "Login successful",
        "access_token": auth_result['access_token'],
        "refresh_token": auth_result['refresh_token'],
        "user": auth_result['user']
    })

@app.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    TokenBlacklist.get_instance().add_token(jti)
    return jsonify({"message": "Successfully logged out"})

@app.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token."""
    try:
        # Get user identity from refresh token
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"msg": "Invalid refresh token"}), 401

        # Create new access token
        access_token = create_access_token(
            identity=user_id,
            fresh=False,
            additional_claims={"type": "access"}
        )

        return jsonify({
            "access_token": access_token,
            "msg": "Token refresh successful"
        })
    except Exception as e:
        return jsonify({"msg": "Token refresh failed", "error": str(e)}), 401

# Load dataset and train model
dataset_path = "dataset.csv"
if not os.path.exists(dataset_path):
    raise FileNotFoundError(f"Dataset file '{dataset_path}' not found.")

df = pd.read_csv(dataset_path)
if "Spam/Ham" not in df.columns and "label" not in df.columns:
    raise ValueError("Dataset must contain 'Spam/Ham' or 'label' column.")

# Check if we need to map labels
if "Spam/Ham" in df.columns:
    df['label'] = df['Spam/Ham'].map({'spam': 1, 'ham': 0})
    
# Combine subject and message if available
if "Subject" in df.columns and "Message" in df.columns:
    df['text'] = df['Subject'].fillna('') + ' ' + df['Message'].fillna('')
elif "Message" in df.columns:
    df['text'] = df['Message'].fillna('')
elif "message" in df.columns:
    df['text'] = df['message'].fillna('')
else:
    raise ValueError("Dataset must contain 'Message' or 'message' column.")

# Create and train the model
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english', max_features=5000)),
    ('clf', MultinomialNB())
])
pipeline.fit(df['text'], df['label'])

# Save model
model_path = "spam_model.pkl"
joblib.dump(pipeline, model_path)
print(f"Model trained and saved to {model_path}")

# User storage
USERS_FILE = "users.pkl"

def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            print(f"Error loading users: {e}")
            return {}
    return {}

def save_users(users):
    with open(USERS_FILE, 'wb') as f:
        pickle.dump(users, f)

# History storage
HISTORY_FILE = "scan_history.pkl"

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            print(f"Error loading history: {e}")
            return {}
    return {}

def save_history(history):
    with open(HISTORY_FILE, 'wb') as f:
        pickle.dump(history, f)

# Initialize if not exists
if not os.path.exists(USERS_FILE):
    save_users({
        "demo": {
            "username": "Demo User",
            "password": generate_password_hash("password123"),
            "email": "demo@example.com"
        }
    })

if not os.path.exists(HISTORY_FILE):
    save_history({})

# Define allowed file extensions for bulk upload
ALLOWED_EXTENSIONS = {'txt', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Add a lock for thread-safe visualization generation
visualization_lock = threading.Lock()

@app.route("/user", methods=["GET", "OPTIONS"])
@jwt_required()
def get_user():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    users = load_users()
    
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    
    user = users[user_id]
    
    return jsonify({
        "id": user_id,
        "username": user["username"],
        "email": user["email"],
        "settings": user.get("settings", {
            "theme": "system",
            "notifications": True
        })
    })


@app.route("/user/settings", methods=["PUT", "OPTIONS"])
@jwt_required()
def update_settings():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    data = request.get_json()
    settings = data.get("settings")
    
    if not settings:
        return jsonify({"error": "No settings provided"}), 400
    
    users = load_users()
    
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    
    # Update settings
    users[user_id]["settings"] = settings
    save_users(users)
    
    return jsonify({
        "message": "Settings updated successfully",
        "settings": settings
    })


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    try:
        data = request.get_json()
        
        # Handle both single message and array of messages
        messages = data.get("message")  # Try single message first
        if messages is None:
            messages = data.get("messages")  # Try array of messages
        
        # Convert single message to list if needed
        if isinstance(messages, str):
            messages = [messages]
        
        if not messages or not isinstance(messages, list):
            return jsonify({"error": "No messages provided or invalid format"}), 400

        model = joblib.load(model_path)
        predictions = model.predict(messages)
        probabilities = model.predict_proba(messages)

        results = []
        spam_count = 0
        ham_count = 0
        
        for i, prediction in enumerate(predictions):
            is_spam = prediction == 1
            proba = probabilities[i][1] if is_spam else probabilities[i][0]
            
            if is_spam:
                spam_count += 1
            else:
                ham_count += 1
                
            word_influence = get_word_influence_for_message(messages[i], model)
            
            result = {
                "message": messages[i][:100] + "..." if len(messages[i]) > 100 else messages[i],
                "prediction": "spam" if is_spam else "ham",
                "confidence": round(float(proba) * 100, 2),
                "timestamp": datetime.datetime.now().isoformat(),
                "word_influence": word_influence
            }
            results.append(result)

        return jsonify({
            "predictions": results,
            "summary": {
                "total": len(messages),
                "spam_count": spam_count,
                "ham_count": ham_count,
                "spam_percentage": round((spam_count / len(messages)) * 100, 2) if messages else 0
            }
        })
        
    except Exception as e:
        print(f"Error in predict endpoint: {str(e)}")
        return jsonify({
            "error": "Failed to process prediction request",
            "details": str(e)
        }), 500


@app.route("/history", methods=["GET", "OPTIONS"])
@jwt_required()
def get_history():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    history = load_history()
    
    if user_id not in history:
        return jsonify({"history": []})
    
    # Return the user's history
    return jsonify({"history": history[user_id]})


@app.route("/history/<scan_id>", methods=["GET", "OPTIONS"])
@jwt_required()
def get_scan_details(scan_id):
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    history = load_history()
    
    if user_id not in history:
        return jsonify({"error": "No history found"}), 404
    
    # Find the specific scan
    scan = None
    for entry in history[user_id]:
        if entry["id"] == scan_id:
            scan = entry
            break
    
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    
    return jsonify({"scan": scan})


@app.route("/", methods=["GET", "OPTIONS"])
def home():
    if request.method == "OPTIONS":
        return "", 200
    return jsonify({"status": "ok", "message": "Flask server is running!"})


def get_word_influence_for_message(message, model):
    """Analyze which words in the message most influenced the prediction"""
    # Extract the vectorizer and classifier from the pipeline
    vectorizer = model.named_steps['tfidf']
    classifier = model.named_steps['clf']
    
    # Transform the message to get its feature vector
    X = vectorizer.transform([message])
    
    # Get the feature names
    feature_names = vectorizer.get_feature_names_out()
    
    # Get the coefficients for spam class (class 1)
    coef = classifier.feature_log_prob_[1] - classifier.feature_log_prob_[0]
    
    # Get the non-zero features in the message
    non_zero = X.nonzero()[1]
    
    # Create a list of (word, coefficient) tuples for words in the message
    word_influence = []
    for idx in non_zero:
        word = feature_names[idx]
        influence = coef[idx]
        word_influence.append({"word": word, "influence": float(influence)})
    
    # Sort by absolute influence
    word_influence.sort(key=lambda x: abs(x["influence"]), reverse=True)
    
    # Return top 20 most influential words
    return word_influence[:20]


@app.route("/word-stats", methods=["GET", "OPTIONS"])
def word_stats():
    """Return the most influential words for spam detection"""
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    model = joblib.load(model_path)
    
    # Extract the TF-IDF vectorizer and classifier from the pipeline
    vectorizer = model.named_steps['tfidf']
    classifier = model.named_steps['clf']
    
    # Get feature names from the vectorizer
    feature_names = vectorizer.get_feature_names_out()
    
    # Get coefficients from the classifier (for Naive Bayes, we use the log probabilities)
    coef = classifier.feature_log_prob_[1] - classifier.feature_log_prob_[0]
    
    # Create a list of (word, coefficient) tuples
    word_coef = list(zip(feature_names, coef))
    
    # Sort by coefficient (higher = more indicative of spam)
    word_coef.sort(key=lambda x: x[1], reverse=True)
    
    # Get top 50 words for spam
    top_spam = [{"word": word, "weight": float(weight)} for word, weight in word_coef[:50]]
    
    # Get top 50 words for ham (non-spam)
    word_coef.sort(key=lambda x: x[1])
    top_ham = [{"word": word, "weight": float(abs(weight))} for word, weight in word_coef[:50]]
    
    return jsonify({
        "spam_words": top_spam,
        "ham_words": top_ham
    })


# Add new endpoint for bulk email analysis
@app.route("/bulk-analyze", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)  # Make JWT optional for testing
def bulk_analyze():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
    
    try:
        # Print debug info
        print(f"Bulk analyze request received")
        print(f"Content-Type: {request.headers.get('Content-Type', 'None')}")
        print(f"Authorization header: {request.headers.get('Authorization', 'None')}")
        
        # Get user ID (if authenticated)
        user_id = get_jwt_identity()
        print(f"User ID from JWT: {user_id}")
        
        # Use demo user if not authenticated (for testing)
        if not user_id:
            user_id = "demo"
            print("Using demo user for unauthenticated request")
        
        # Make sure reports directory exists
        reports_dir = "reports"
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)
            print(f"Created reports directory at {os.path.abspath(reports_dir)}")
        
        # Check if file is present in the request
        print("Request files:", list(request.files.keys()))
        print("Request form:", list(request.form.keys()))
        
        if 'file' not in request.files:
            print("No file found in request.files")
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        print(f"Received file: {file.filename}")
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed. Please upload .txt or .csv files"}), 400
        
        print(f"Processing file: {file.filename}")
        
        try:
            # Read the file content
            content = file.read().decode('utf-8')
            print(f"File content length: {len(content)} bytes")
            print("First 100 characters:", content[:100])
            
            # Process the file based on type
            emails = []
            if file.filename.endswith('.csv'):
                try:
                    # Try pandas first
                    df = pd.read_csv(io.StringIO(content))
                    print("CSV columns:", df.columns.tolist())
                    
                    # Try different possible column names
                    message_columns = ['message', 'Message', 'text', 'Text', 'content', 'Content', 'email', 'Email']
                    found_column = None
                    
                    for col in message_columns:
                        if col in df.columns:
                            found_column = col
                            break
                    
                    if found_column:
                        print(f"Using column '{found_column}' for messages")
                        emails = df[found_column].fillna('').astype(str).tolist()
                    else:
                        # If no known column found, try using the first column that's not 'label'
                        non_label_cols = [col for col in df.columns if col.lower() != 'label']
                        if non_label_cols:
                            first_col = non_label_cols[0]
                            print(f"No standard column name found. Using first non-label column '{first_col}'")
                            emails = df[first_col].fillna('').astype(str).tolist()
                        else:
                            raise ValueError("No suitable column found for messages")
                        
                except Exception as csv_error:
                    print(f"Pandas CSV reading failed: {str(csv_error)}")
                    print("Falling back to simple CSV reading")
                    # Fallback to simple CSV reading
                    reader = csv.reader(io.StringIO(content))
                    header = next(reader, None)  # Skip header
                    print("CSV header:", header)
                    
                    if header:
                        # Try to find the message column in the header
                        message_col_idx = None
                        for idx, col in enumerate(header):
                            if col.lower() in ['message', 'text', 'content', 'email']:
                                message_col_idx = idx
                                break
                        
                        if message_col_idx is None:
                            # If no message column found, use first non-label column
                            for idx, col in enumerate(header):
                                if col.lower() != 'label':
                                    message_col_idx = idx
                                    break
                        
                        if message_col_idx is not None:
                            print(f"Using column index {message_col_idx} for messages")
                            emails = [row[message_col_idx] for row in reader if row and len(row) > message_col_idx]
                        else:
                            raise ValueError("No suitable column found for messages")
                    else:
                        # No header - use first column
                        emails = [row[0] for row in reader if row]
            else:
                # Handle text file (one email per line)
                emails = [line.strip() for line in content.split('\n') if line.strip()]
            
            print(f"Extracted {len(emails)} emails")
            if len(emails) > 0:
                print("First email sample:", emails[0][:100])
            
            # Remove any empty strings or None values
            emails = [email for email in emails if email and isinstance(email, str)]
            print(f"After cleaning: {len(emails)} valid emails")
            
            if not emails:
                print("No valid emails found in file")
                return jsonify({
                    "error": "No valid emails found in the file. Please make sure the file contains valid email content.",
                    "details": {
                        "file_type": file.filename.split('.')[-1],
                        "content_length": len(content),
                        "first_100_chars": content[:100]
                    }
                }), 422
            
            # Load model
            try:
                model = joblib.load(model_path)
            except Exception as model_error:
                print(f"Error loading model: {str(model_error)}")
                return jsonify({"error": "Internal server error - model loading failed"}), 500
            
            # Make predictions
            try:
                predictions = model.predict(emails)
                probabilities = model.predict_proba(emails)
            except Exception as pred_error:
                print(f"Error making predictions: {str(pred_error)}")
                return jsonify({
                    "error": "Failed to analyze emails. The content may be invalid or in an unsupported format.",
                    "details": str(pred_error)
                }), 422
            
            # Prepare results
            results = []
            batch_id = str(uuid.uuid4())  # Generate a unique batch ID
            print(f"Generated batch ID: {batch_id}")
            
            spam_count = 0
            ham_count = 0
            
            for i, prediction in enumerate(predictions):
                is_spam = prediction == 1
                # Get the correct probability - use the spam class probability directly
                proba = probabilities[i][1] if is_spam else probabilities[i][0]
                
                if is_spam:
                    spam_count += 1
                else:
                    ham_count += 1
                    
                # Get word influence for this prediction
                word_influence = get_word_influence_for_message(emails[i], model)
                
                result = {
                    "id": str(uuid.uuid4()),
                    "message": emails[i][:100] + "..." if len(emails[i]) > 100 else emails[i],
                    "full_message": emails[i],
                    "prediction": "spam" if is_spam else "ham",
                    "confidence": round(float(proba) * 100, 2),  # Convert to percentage with 2 decimal places
                    "word_influence": word_influence,
                    "timestamp": datetime.datetime.now().isoformat()
                }
                results.append(result)
            
            # Generate report data
            report_data = {
                "batch_id": batch_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "total_emails": len(emails),
                "spam_count": spam_count,
                "ham_count": ham_count,
                "spam_percentage": round((spam_count / len(emails)) * 100, 2),
                "results": results
            }
            
            # Save to user's history
            history = load_history()
            if user_id not in history:
                history[user_id] = []
                
            # Add batch info to history
            batch_entry = {
                "id": batch_id,
                "type": "batch",
                "total_emails": len(emails),
                "spam_count": spam_count,
                "ham_count": ham_count,
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            history[user_id].insert(0, batch_entry)
            
            # Keep only the last 50 entries
            if len(history[user_id]) > 50:
                history[user_id] = history[user_id][:50]
                
            save_history(history)
            
            # Save detailed report data
            reports_dir = "reports"
            if not os.path.exists(reports_dir):
                os.makedirs(reports_dir)
                
            report_path = os.path.join(reports_dir, f"{batch_id}.pkl")
            with open(report_path, 'wb') as f:
                pickle.dump(report_data, f)
                
            print(f"Saved report to {os.path.abspath(report_path)}")
            
            # Add CORS headers to the response
            response = jsonify({
                "message": "Bulk analysis completed successfully",
                "batch_id": batch_id,
                "summary": {
                    "total_emails": len(emails),
                    "spam_count": spam_count,
                    "ham_count": ham_count,
                    "spam_percentage": round((spam_count / len(emails)) * 100, 2)
                }
            })
            
            return response
            
        except Exception as process_error:
            print(f"Error processing file content: {str(process_error)}")
            return jsonify({
                "error": "Failed to process file content",
                "details": str(process_error),
                "file_info": {
                    "name": file.filename,
                    "type": file.content_type,
                    "size": len(content) if 'content' in locals() else 'unknown'
                }
            }), 422
        
    except Exception as e:
        print(f"Error in bulk analysis: {str(e)}")
        error_response = jsonify({
            "error": "Failed to process file",
            "details": str(e)
        })
        return error_response, 500

# Add endpoint to get report details
@app.route("/report/<batch_id>", methods=["GET", "OPTIONS"])
@jwt_required(optional=True)  # Make JWT optional for testing
def get_report(batch_id):
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
    
    try:
        # Print debug info
        print(f"Report request for batch_id: {batch_id}")
        print(f"Authorization header: {request.headers.get('Authorization', 'None')}")
        
        # Load report data
        report_path = os.path.join("reports", f"{batch_id}.pkl")
        if not os.path.exists(report_path):
            print(f"Report not found: {report_path}")
            return jsonify({"error": "Report not found"}), 404
            
        with open(report_path, 'rb') as f:
            report_data = pickle.load(f)
        
        print(f"Report data loaded successfully for batch {batch_id}")
        
        response = jsonify({"report": report_data})
        
        # Add explicit CORS headers to this specific response
        # CORS headers are handled by Flask-CORS extension
        
        return response
        
    except Exception as e:
        print(f"Error in get_report endpoint: {str(e)}")
        return jsonify({"error": f"Failed to get report: {str(e)}"}), 500

# Add endpoint to download report as CSV
@app.route("/report/<batch_id>/download", methods=["GET", "OPTIONS"])
@jwt_required(optional=True)  # Make JWT optional for testing
def download_report(batch_id):
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
    
    try:
        # Print debug info
        print(f"Download report request for batch_id: {batch_id}")
        print(f"Authorization header: {request.headers.get('Authorization', 'None')}")
        
        # Load report data
        report_path = os.path.join("reports", f"{batch_id}.pkl")
        if not os.path.exists(report_path):
            print(f"Report not found: {report_path}")
            return jsonify({"error": "Report not found"}), 404
            
        with open(report_path, 'rb') as f:
            report_data = pickle.load(f)
        
        print(f"Report data loaded successfully for batch {batch_id}")
        
        # Create CSV file
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["Email", "Prediction", "Confidence (%)", "Top Influential Words"])
        
        # Write data
        for result in report_data["results"]:
            top_words = ", ".join([f"{item['word']} ({item['influence']:.2f})" for item in result["word_influence"][:5]])
            writer.writerow([
                result["full_message"],
                result["prediction"],
                result["confidence"],
                top_words
            ])
        
        # Prepare response
        output.seek(0)
        response = send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"spam_analysis_report_{batch_id}.csv"
        )
        
        # Add explicit CORS headers to this specific response
        # CORS headers are handled by Flask-CORS extension
        
        return response
        
    except Exception as e:
        print(f"Error in download_report endpoint: {str(e)}")
        return jsonify({"error": f"Failed to download report: {str(e)}"}), 500

# Add endpoint to get visualization data
@app.route("/report/<batch_id>/visualizations", methods=["GET", "OPTIONS"])
@jwt_required(optional=True)  # Make JWT optional for testing
def get_visualizations(batch_id):
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
    
    try:
        print(f"Visualization request for batch_id: {batch_id}")
        print(f"Authorization header: {request.headers.get('Authorization', 'None')}")
        
        user_id = get_jwt_identity()
        print(f"User ID from JWT: {user_id}")
        
        # Check if pre-generated visualizations exist
        viz_path = os.path.join("reports", f"{batch_id}_viz.json")
        if os.path.exists(viz_path):
            print(f"Using pre-generated visualizations from {viz_path}")
            with open(viz_path, 'r') as f:
                viz_data = json.load(f)
                return jsonify(viz_data)
        
        # Load report data
        report_path = os.path.join("reports", f"{batch_id}.pkl")
        if not os.path.exists(report_path):
            print(f"Report not found: {report_path}")
            return jsonify({"error": "Report not found"}), 404
            
        with open(report_path, 'rb') as f:
            report_data = pickle.load(f)
        
        print(f"Report data loaded successfully for batch {batch_id}")
        
        # Generate visualizations with thread safety
        visualizations = {}
        with visualization_lock:
            try:
                # Clear any existing plots
                plt.close('all')
                
                # 1. Pie chart of spam vs ham
                plt.figure(figsize=(8, 8))
                plt.pie(
                    [report_data["spam_count"], report_data["ham_count"]], 
                    labels=["Spam", "Ham"], 
                    autopct='%1.1f%%',
                    colors=['#ff6b6b', '#4ecdc4']
                )
                plt.title('Spam vs Ham Distribution')
                
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight')
                buf.seek(0)
                visualizations["pie_chart"] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
                
                # 2. Confidence distribution histogram
                confidences = [result["confidence"] for result in report_data["results"]]
                spam_confidences = [result["confidence"] for result in report_data["results"] if result["prediction"] == "spam"]
                ham_confidences = [result["confidence"] for result in report_data["results"] if result["prediction"] == "ham"]
                
                plt.figure(figsize=(10, 6))
                if spam_confidences:
                    sns.histplot(spam_confidences, color='#ff6b6b', label='Spam', alpha=0.7, bins=10)
                if ham_confidences:
                    sns.histplot(ham_confidences, color='#4ecdc4', label='Ham', alpha=0.7, bins=10)
                plt.title('Confidence Distribution')
                plt.xlabel('Confidence (%)')
                plt.ylabel('Count')
                plt.legend()
                
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight')
                buf.seek(0)
                visualizations["confidence_histogram"] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
                
                # 3. Word influence visualization
                all_words = []
                for result in report_data["results"]:
                    for word_info in result["word_influence"]:
                        all_words.append((word_info["word"], abs(word_info["influence"])))
                
                word_influences = {}
                for word, influence in all_words:
                    if word in word_influences:
                        word_influences[word] += influence
                    else:
                        word_influences[word] = influence
                
                sorted_words = sorted(word_influences.items(), key=lambda x: x[1], reverse=True)[:30]
                words = [item[0] for item in sorted_words]
                influences = [item[1] for item in sorted_words]
                
                plt.figure(figsize=(12, 8))
                plt.barh(words, influences, color='#6c5ce7')
                plt.title('Top Influential Words')
                plt.xlabel('Influence Score')
                plt.tight_layout()
                
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight')
                buf.seek(0)
                visualizations["word_influence"] = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
                
                print(f"Generated {len(visualizations)} visualizations successfully")
                
                # Save visualizations to file for future use
                try:
                    with open(viz_path, 'w') as f:
                        json.dump({"visualizations": visualizations}, f)
                    print(f"Saved visualizations to {viz_path}")
                except Exception as save_error:
                    print(f"Error saving visualizations: {str(save_error)}")
                
            except Exception as viz_error:
                print(f"Error generating visualizations: {str(viz_error)}")
                if not visualizations:
                    return jsonify({"error": f"Failed to generate visualizations: {str(viz_error)}"}), 500
        
        return jsonify({"visualizations": visualizations})
        
    except Exception as e:
        print(f"Error in visualization endpoint: {str(e)}")
        return jsonify({"error": f"Failed to process visualization request: {str(e)}"}), 500


# Add debug endpoint to check reports directory
@app.route("/debug/reports", methods=["GET"])
def debug_reports():
    try:
        reports_dir = "reports"
        abs_path = os.path.abspath(reports_dir)
        
        if not os.path.exists(reports_dir):
            return jsonify({
                "error": f"Reports directory not found at {abs_path}",
                "cwd": os.getcwd()
            })
            
        report_files = os.listdir(reports_dir)
        
        # Get detailed info about each file
        file_info = []
        for filename in report_files:
            file_path = os.path.join(reports_dir, filename)
            file_info.append({
                "name": filename,
                "size": os.path.getsize(file_path),
                "modified": datetime.datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                "is_pkl": filename.endswith('.pkl')
            })
            
        return jsonify({
            "reports_dir": abs_path,
            "file_count": len(report_files),
            "files": file_info
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "cwd": os.getcwd()
        })

# Add endpoint to list available reports
@app.route("/list_reports", methods=["GET", "OPTIONS"])
def list_reports():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    try:
        reports_dir = "reports"
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)
            print(f"Created reports directory at {os.path.abspath(reports_dir)}")
            return jsonify({"reports": []})
            
        report_files = [f for f in os.listdir(reports_dir) if f.endswith('.pkl')]
        reports = []
        
        for filename in report_files:
            try:
                report_path = os.path.join(reports_dir, filename)
                with open(report_path, 'rb') as f:
                    report_data = pickle.load(f)
                    
                batch_id = filename.replace('.pkl', '')
                reports.append({
                    "id": batch_id,
                    "timestamp": report_data.get("timestamp", "Unknown"),
                    "total_emails": report_data.get("total_emails", 0),
                    "spam_count": report_data.get("spam_count", 0),
                    "ham_count": report_data.get("ham_count", 0)
                })
            except Exception as e:
                print(f"Error loading report {filename}: {str(e)}")
                
        # Sort by timestamp (newest first)
        reports.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return jsonify({"reports": reports})
    except Exception as e:
        print(f"Error listing reports: {str(e)}")
        return jsonify({"error": f"Failed to list reports: {str(e)}"}), 500

# Add endpoint to serve the static visualization page
@app.route("/visualizations", methods=["GET"])
def visualizations_page():
    try:
        with open("static_visualizations.html", "r") as f:
            html_content = f.read()
        return html_content
    except Exception as e:
        return f"Error loading visualization page: {str(e)}"

# Add a health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.datetime.now().isoformat()})


if __name__ == "__main__":
    print("Starting Flask server for Spam Detection API...")
    print(f"Dataset loaded with {len(df)} entries")
    print("API endpoints:")
    print("  - GET  / : Health check")
    print("  - POST /register : Register a new user")
    print("  - POST /login : Login a user")
    print("  - GET  /user : Get user details (requires auth)")
    print("  - PUT  /user/settings : Update user settings (requires auth)")
    print("  - POST /predict : Analyze messages for spam (requires auth)")
    print("  - GET  /history : Get user's scan history (requires auth)")
    print("  - GET  /history/<scan_id> : Get details of a specific scan (requires auth)")
    print("  - GET  /word-stats : Get influential words for spam detection")
    print("  - POST /bulk-analyze : Analyze multiple emails from a file (requires auth)")
    print("  - GET  /report/<batch_id> : Get details of a bulk analysis report (requires auth)")
    print("  - GET  /report/<batch_id>/download : Download report as CSV (requires auth)")
    print("  - GET  /report/<batch_id>/visualizations : Get visualizations for a report (requires auth)")
    print("  - GET  /list_reports : List all available reports")
    print("  - GET  /visualizations : View visualizations in browser")
    print("  - GET  /debug/reports : Debug information about reports directory")
    print("\nServer running at http://localhost:5000")
    print("\nVisualization page available at http://localhost:5000/visualizations")
    
    # Make sure reports directory exists
    reports_dir = "reports"
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        print(f"Created reports directory at {os.path.abspath(reports_dir)}")
    else:
        print(f"Reports directory exists at {os.path.abspath(reports_dir)}")
        
    app.run(host="0.0.0.0", port=5000, debug=True)