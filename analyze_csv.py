import requests
import json
import sys
import os

# Configuration
API_URL = 'http://localhost:5001'
EMAIL_FILE = 'unlabeled_emails.csv'  # CSV file with emails to analyze
LOGIN_EMAIL = 'demo@example.com'
LOGIN_PASSWORD = 'password123'

def main():
    try:
        # Check if the file exists
        if not os.path.exists(EMAIL_FILE):
            print(f"Error: File {EMAIL_FILE} not found")
            sys.exit(1)
            
        # Login to get a token
        print(f"Attempting to log in as {LOGIN_EMAIL}...")
        login_response = requests.post(f'{API_URL}/login', json={
            "email": LOGIN_EMAIL,
            "password": LOGIN_PASSWORD
        })
        login_response.raise_for_status()
        
        # Extract the token
        token_data = login_response.json()
        if 'access_token' not in token_data:
            print(f"Error: No access token in response: {token_data}")
            sys.exit(1)
            
        token = token_data['access_token']
        print(f"Login successful. Token received.")
        
        # Set up headers with proper format
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # Read the CSV file
        with open(EMAIL_FILE, 'r') as f:
            csv_content = f.read()
        
        # Create a file object for the request
        files = {'file': (EMAIL_FILE, csv_content)}
        
        # Make the API call with the authorization header
        print(f"Sending {EMAIL_FILE} for analysis...")
        response = requests.post(f'{API_URL}/bulk-analyze', 
                               files=files, 
                               headers=headers)
        response.raise_for_status()
        
        # Print the response
        response_data = response.json()
        print(json.dumps(response_data, indent=2))
        
        # Save the batch ID for later use
        batch_id = response_data.get('batch_id')
        if not batch_id:
            print("Warning: No batch ID in response")
        else:
            print(f"\nAnalysis successful!")
            print(f"Batch ID: {batch_id}")
            print(f"Access visualizations at: {API_URL}/visualizations")
            print(f"Enter the batch ID: {batch_id}")
            
            # Fetch report details
            print("\nFetching report details...")
            report_response = requests.get(
                f'{API_URL}/report/{batch_id}',
                headers=headers
            )
            report_response.raise_for_status()
            report_data = report_response.json()
            
            # Display summary
            if 'report' in report_data:
                report = report_data['report']
                print("\nReport Summary:")
                print(f"Total emails: {report.get('total_emails', 'N/A')}")
                print(f"Spam detected: {report.get('spam_count', 'N/A')}")
                print(f"Ham detected: {report.get('ham_count', 'N/A')}")
                print(f"Spam percentage: {report.get('spam_percentage', 'N/A')}%")
                
                # Save report to file
                with open(f'report_{batch_id}.json', 'w') as f:
                    json.dump(report_data, f, indent=2)
                print(f"\nDetailed report saved to report_{batch_id}.json")

    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the server")
        print(f"Make sure the Flask server is running at {API_URL}")
    except requests.exceptions.HTTPError as e:
        print(f"ERROR: HTTP error occurred: {e}")
        print(f"Response: {e.response.text}")
    except json.JSONDecodeError:
        print(f"ERROR: Could not parse server response as JSON")
        print(f"Raw response: {response.text if 'response' in locals() else 'No response'}")
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()