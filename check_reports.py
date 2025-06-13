import os
import pickle
import sys
import json
import base64
import matplotlib.pyplot as plt
import seaborn as sns
import io

def check_reports_directory():
    """Check if the reports directory exists and list its contents"""
    reports_dir = "reports"
    
    print(f"Checking reports directory: {os.path.abspath(reports_dir)}")
    
    if not os.path.exists(reports_dir):
        print(f"Reports directory does not exist!")
        return False
        
    report_files = os.listdir(reports_dir)
    print(f"Found {len(report_files)} files in reports directory:")
    
    for filename in sorted(report_files):
        file_path = os.path.join(reports_dir, filename)
        file_size = os.path.getsize(file_path)
        print(f"  - {filename} ({file_size} bytes)")
        
    return True

def check_report(batch_id):
    """Check if a specific report exists and display its contents"""
    report_path = os.path.join("reports", f"{batch_id}.pkl")
    
    if not os.path.exists(report_path):
        print(f"Report not found: {report_path}")
        return False
        
    print(f"Found report: {report_path}")
    
    try:
        with open(report_path, 'rb') as f:
            report_data = pickle.load(f)
            
        print(f"Report data:")
        print(f"  - Batch ID: {report_data.get('batch_id', 'Not found')}")
        print(f"  - Timestamp: {report_data.get('timestamp', 'Not found')}")
        print(f"  - Total emails: {report_data.get('total_emails', 'Not found')}")
        print(f"  - Spam count: {report_data.get('spam_count', 'Not found')}")
        print(f"  - Ham count: {report_data.get('ham_count', 'Not found')}")
        print(f"  - Results count: {len(report_data.get('results', []))}")
        
        # Check if visualizations exist
        viz_path = os.path.join("reports", f"{batch_id}_viz.json")
        if os.path.exists(viz_path):
            print(f"Visualizations found: {viz_path}")
            with open(viz_path, 'r') as f:
                viz_data = json.load(f)
                print(f"  - Visualization keys: {list(viz_data.get('visualizations', {}).keys())}")
        else:
            print(f"Visualizations not found: {viz_path}")
            print("Generating visualizations now...")
            generate_visualizations(report_data, batch_id)
            
        return True
    except Exception as e:
        print(f"Error reading report: {str(e)}")
        return False

def generate_visualizations(report_data, batch_id):
    """Generate visualizations for a report"""
    try:
        visualizations = {}
        
        # 1. Pie chart
        plt.figure(figsize=(8, 8))
        plt.pie(
            [report_data["spam_count"], report_data["ham_count"]], 
            labels=["Spam", "Ham"], 
            autopct='%1.1f%%',
            colors=['#ff6b6b', '#4ecdc4']
        )
        plt.title('Spam vs Ham Distribution')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        visualizations["pie_chart"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        # 2. Confidence histogram
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
        plt.savefig(buf, format='png')
        buf.seek(0)
        visualizations["confidence_histogram"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        # 3. Word influence chart
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
        plt.savefig(buf, format='png')
        buf.seek(0)
        visualizations["word_influence"] = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        # Save visualizations to file
        viz_path = os.path.join("reports", f"{batch_id}_viz.json")
        with open(viz_path, 'w') as f:
            json.dump({"visualizations": visualizations}, f)
            
        print(f"Saved visualizations to {viz_path}")
        return True
    except Exception as e:
        print(f"Error generating visualizations: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Check a specific report
        batch_id = sys.argv[1]
        check_report(batch_id)
    else:
        # Check the reports directory
        check_reports_directory()