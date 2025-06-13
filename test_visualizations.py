import os
import sys
import pickle
import base64
import matplotlib.pyplot as plt
import seaborn as sns
import io

def test_visualizations(batch_id):
    """Test generating visualizations for a specific batch ID"""
    print(f"Testing visualizations for batch ID: {batch_id}")
    
    # Check if report exists
    report_path = os.path.join("reports", f"{batch_id}.pkl")
    if not os.path.exists(report_path):
        print(f"Error: Report not found at {report_path}")
        return False
    
    # Load report data
    try:
        with open(report_path, 'rb') as f:
            report_data = pickle.load(f)
        print(f"Successfully loaded report data")
    except Exception as e:
        print(f"Error loading report data: {str(e)}")
        return False
    
    # Print report summary
    print(f"Report summary:")
    print(f"- Total emails: {report_data['total_emails']}")
    print(f"- Spam count: {report_data['spam_count']}")
    print(f"- Ham count: {report_data['ham_count']}")
    print(f"- Spam percentage: {report_data['spam_percentage']}%")
    
    # Generate visualizations
    visualizations = {}
    
    try:
        # 1. Pie chart
        print("Generating pie chart...")
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
        print("Pie chart generated successfully")
        
        # 2. Confidence histogram
        print("Generating confidence histogram...")
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
        print("Confidence histogram generated successfully")
        
        # 3. Word influence chart
        print("Generating word influence chart...")
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
        print("Word influence chart generated successfully")
        
        # Save visualizations to file for inspection
        viz_path = os.path.join("reports", f"{batch_id}_viz_test.pkl")
        with open(viz_path, 'wb') as f:
            pickle.dump(visualizations, f)
        print(f"Visualizations saved to {viz_path}")
        
        return True
        
    except Exception as e:
        print(f"Error generating visualizations: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_visualizations.py <batch_id>")
        sys.exit(1)
    
    batch_id = sys.argv[1]
    success = test_visualizations(batch_id)
    
    if success:
        print("Visualization test completed successfully")
    else:
        print("Visualization test failed")
        sys.exit(1)