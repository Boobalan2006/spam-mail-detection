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
        # First, get a token by logging in
        login_data = {
            "email": "demo@example.com",
            "password": "password123"
        }

        # Login to get a token
        print("Logging in...")
        login_response = requests.post('http://localhost:5000/login', json=login_data)
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        token = login_response.json().get('access_token')
        headers = {
            'Authorization': f'Bearer {token}'
        }

        # Read the emails from file
        try:
            with open('emails.txt', 'r') as f:
                emails = f.read()
        except FileNotFoundError:
            print("Error: emails.txt file not found")
            return

        # Create a file object for the request
        files = {'file': ('emails.txt', emails)}

        # Make the API call with the authorization header
        print("Analyzing emails...")
        response = requests.post('http://localhost:5000/bulk-analyze', files=files, headers=headers)
        
        if response.status_code != 200:
            print(f"Analysis failed: {response.text}")
            return
            
        # Get the batch ID
        batch_id = response.json().get('batch_id')
        if not batch_id:
            print("Error: No batch ID returned")
            return
            
        print(f"Analysis complete. Batch ID: {batch_id}")
    
    # Create a simple HTML file to display visualizations
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Spam Detection Visualizations</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }}
        .container {{ background-color: #f5f5f5; border-radius: 5px; padding: 20px; }}
        .viz-item {{ margin-bottom: 30px; background-color: white; padding: 15px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .viz-item img {{ max-width: 100%; height: auto; }}
        h1, h2 {{ color: #333; }}
        .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }}
        .summary-item {{ background-color: white; padding: 15px; border-radius: 5px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        .summary-item h3 {{ margin-top: 0; color: #666; font-size: 14px; }}
        .summary-item p {{ font-size: 24px; font-weight: bold; margin: 5px 0 0; }}
        .spam-count {{ color: #e74c3c; }}
        .ham-count {{ color: #2ecc71; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Spam Detection Visualizations</h1>
        <p>Batch ID: {batch_id}</p>
        <div id="content">Loading...</div>
    </div>
    
    <script>
        // Function to load data
        async function loadData() {{
            try {{
                // Login to get token
                const loginResponse = await fetch('http://localhost:5000/login', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ email: "demo@example.com", password: "password123" }})
                }});
                
                if (!loginResponse.ok) throw new Error("Login failed");
                
                const loginData = await loginResponse.json();
                const token = loginData.access_token;
                
                // Get report data
                const reportResponse = await fetch('http://localhost:5000/report/{batch_id}', {{
                    headers: {{ 'Authorization': `Bearer ${{token}}` }}
                }});
                
                if (!reportResponse.ok) throw new Error(`Failed to fetch report: ${{reportResponse.status}}`);
                
                const reportData = await reportResponse.json();
                
                if (!reportData.report) throw new Error("Invalid report data");
                
                // Get visualizations
                const vizResponse = await fetch('http://localhost:5000/report/{batch_id}/visualizations', {{
                    headers: {{ 'Authorization': `Bearer ${{token}}` }}
                }});
                
                if (!vizResponse.ok) throw new Error(`Failed to fetch visualizations: ${{vizResponse.status}}`);
                
                const vizData = await vizResponse.json();
                
                // Display data
                displayData(reportData.report, vizData.visualizations);
                
            }} catch (error) {{
                document.getElementById('content').innerHTML = `<div style="color: red; padding: 20px;">Error: ${{error.message}}</div>`;
            }}
        }}
        
        // Function to display data
        function displayData(report, visualizations) {{
            let html = '';
            
            // Summary section
            html += '<h2>Analysis Summary</h2>';
            html += '<div class="summary-grid">';
            html += `
                <div class="summary-item">
                    <h3>Total Emails</h3>
                    <p>${{report.total_emails}}</p>
                </div>
                <div class="summary-item">
                    <h3>Spam Detected</h3>
                    <p class="spam-count">${{report.spam_count}}</p>
                </div>
                <div class="summary-item">
                    <h3>Ham Detected</h3>
                    <p class="ham-count">${{report.ham_count}}</p>
                </div>
                <div class="summary-item">
                    <h3>Spam Percentage</h3>
                    <p>${{report.spam_percentage}}%</p>
                </div>
            `;
            html += '</div>';
            
            // Visualizations section
            html += '<h2>Visualizations</h2>';
            
            if (!visualizations || Object.keys(visualizations).length === 0) {{
                html += `
                    <div class="viz-item">
                        <h3>Visualizations Not Available</h3>
                        <p>The server has not generated visualizations for this batch yet.</p>
                        <p>Please wait a few moments and refresh the page.</p>
                        <button onclick="loadData()">Refresh</button>
                    </div>
                `;
            }} else {{
                // Pie chart
                if (visualizations.pie_chart) {{
                    html += `
                        <div class="viz-item">
                            <h3>Spam vs Ham Distribution</h3>
                            <img src="data:image/png;base64,${{visualizations.pie_chart}}" alt="Spam vs Ham Distribution">
                        </div>
                    `;
                }}
                
                // Confidence histogram
                if (visualizations.confidence_histogram) {{
                    html += `
                        <div class="viz-item">
                            <h3>Confidence Distribution</h3>
                            <img src="data:image/png;base64,${{visualizations.confidence_histogram}}" alt="Confidence Distribution">
                        </div>
                    `;
                }}
                
                // Word influence
                if (visualizations.word_influence) {{
                    html += `
                        <div class="viz-item">
                            <h3>Top Influential Words</h3>
                            <img src="data:image/png;base64,${{visualizations.word_influence}}" alt="Word Influence">
                        </div>
                    `;
                }}
            }}
            
            // Add refresh button
            html += `
                <div class="viz-item">
                    <h3>Refresh Data</h3>
                    <p>Click the button below to refresh the visualizations.</p>
                    <button onclick="loadData()">Refresh Visualizations</button>
                </div>
            `;
            
            document.getElementById('content').innerHTML = html;
        }}
        
        // Load data when page loads
        window.onload = loadData;
    </script>
</body>
</html>
"""

    # Write the HTML to a file
    html_file = "batch_visualizations.html"
    with open(html_file, "w") as f:
        f.write(html_content)
    
    # Open the HTML file in the default browser
    print(f"Opening visualizations in browser...")
    file_path = os.path.abspath(html_file)
    webbrowser.open('file://' + file_path)
    
    print(f"Visualizations opened in your browser.")
    print(f"If visualizations don't appear immediately, wait a few moments and click 'Refresh Visualizations'.")

if __name__ == "__main__":
    main()