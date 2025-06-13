import requests
import json
import webbrowser
import os
import sys
import time

def main():
    # Check if batch_id was provided as command line argument
    if len(sys.argv) > 1:
        batch_id = sys.argv[1]
    else:
        # Ask for batch ID
        batch_id = input("Enter the batch ID: ")
    
    if not batch_id:
        print("No batch ID provided. Exiting.")
        return
        
    # Login to get a token
    print("Logging in...")
    login_data = {
        "email": "demo@example.com",
        "password": "password123"
    }
    
    login_response = requests.post('http://localhost:5001/login', json=login_data)
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
        
    token = login_response.json().get('access_token')
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # Get report data
    print(f"Fetching report data for batch ID: {batch_id}")
    report_response = requests.get(f'http://localhost:5001/report/{batch_id}', headers=headers)
    
    if report_response.status_code != 200:
        print(f"Failed to fetch report: {report_response.text}")
        return
        
    report_data = report_response.json().get('report')
    if not report_data:
        print("Invalid report data received")
        return
        
    # Get visualizations
    print("Fetching visualizations...")
    viz_response = requests.get(f'http://localhost:5001/report/{batch_id}/visualizations', headers=headers)
    
    if viz_response.status_code != 200:
        print(f"Failed to fetch visualizations: {viz_response.text}")
        return
        
    viz_data = viz_response.json().get('visualizations')
    
    # Create a simple HTML file with the visualizations
    html_file = f"visualizations_{batch_id}.html"
    
    with open(html_file, "w") as f:
        f.write(f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spam Detection Visualizations - Batch {batch_id}</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }}
                h1, h2 {{ color: #333; }}
                .summary {{ display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }}
                .summary-item {{ background: #f5f5f5; padding: 15px; border-radius: 5px; min-width: 150px; text-align: center; }}
                .summary-item h3 {{ margin-top: 0; color: #666; }}
                .summary-item p {{ font-size: 24px; font-weight: bold; margin: 5px 0 0; }}
                .spam-count {{ color: #e74c3c; }}
                .ham-count {{ color: #2ecc71; }}
                .viz-container {{ margin-top: 30px; }}
                .viz-item {{ margin-bottom: 40px; }}
                img {{ max-width: 100%; border: 1px solid #ddd; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <h1>Spam Detection Visualizations</h1>
            <p>Batch ID: {batch_id}</p>
            
            <h2>Analysis Summary</h2>
            <div class="summary">
                <div class="summary-item">
                    <h3>Total Emails</h3>
                    <p>{report_data.get('total_emails', 'N/A')}</p>
                </div>
                <div class="summary-item">
                    <h3>Spam Detected</h3>
                    <p class="spam-count">{report_data.get('spam_count', 'N/A')}</p>
                </div>
                <div class="summary-item">
                    <h3>Ham Detected</h3>
                    <p class="ham-count">{report_data.get('ham_count', 'N/A')}</p>
                </div>
                <div class="summary-item">
                    <h3>Spam Percentage</h3>
                    <p>{report_data.get('spam_percentage', 'N/A')}%</p>
                </div>
            </div>
            
            <h2>Visualizations</h2>
            <div class="viz-container">
        """)
        
        # Add visualizations if available
        if not viz_data or len(viz_data) == 0:
            f.write("""
                <p>No visualizations available for this batch. The server may still be generating them.</p>
                <p>Please wait a few moments and run this script again.</p>
            """)
        else:
            # Pie chart
            if 'pie_chart' in viz_data:
                f.write(f"""
                <div class="viz-item">
                    <h3>Spam vs Ham Distribution</h3>
                    <img src="data:image/png;base64,{viz_data['pie_chart']}" alt="Spam vs Ham Distribution">
                </div>
                """)
                
            # Confidence histogram
            if 'confidence_histogram' in viz_data:
                f.write(f"""
                <div class="viz-item">
                    <h3>Confidence Distribution</h3>
                    <img src="data:image/png;base64,{viz_data['confidence_histogram']}" alt="Confidence Distribution">
                </div>
                """)
                
            # Word influence
            if 'word_influence' in viz_data:
                f.write(f"""
                <div class="viz-item">
                    <h3>Top Influential Words</h3>
                    <img src="data:image/png;base64,{viz_data['word_influence']}" alt="Word Influence">
                </div>
                """)
        
        # Close HTML
        f.write("""
            </div>
        </body>
        </html>
        """)
    
    # Open the HTML file in the default browser
    print(f"Opening visualizations in browser...")
    file_path = os.path.abspath(html_file)
    webbrowser.open('file://' + file_path)
    
    print(f"Visualizations saved to {html_file} and opened in your browser.")
    print("The visualizations will remain visible until you close the browser tab.")

if __name__ == "__main__":
    main()