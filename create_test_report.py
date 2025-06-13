import os
import pickle
import uuid
import datetime

# Create a test report
def create_test_report():
    # Make sure reports directory exists
    reports_dir = "reports"
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        print(f"Created reports directory at {os.path.abspath(reports_dir)}")
    
    # Create a simple report
    batch_id = str(uuid.uuid4())
    report_data = {
        "batch_id": batch_id,
        "timestamp": datetime.datetime.now().isoformat(),
        "total_emails": 10,
        "spam_count": 4,
        "ham_count": 6,
        "spam_percentage": 40.0,
        "results": [
            {
                "id": str(uuid.uuid4()),
                "message": "Test email 1",
                "full_message": "This is a test email 1",
                "prediction": "spam",
                "confidence": 95.5,
                "word_influence": [
                    {"word": "test", "influence": 0.8},
                    {"word": "email", "influence": 0.5}
                ],
                "timestamp": datetime.datetime.now().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "message": "Test email 2",
                "full_message": "This is a test email 2",
                "prediction": "ham",
                "confidence": 87.3,
                "word_influence": [
                    {"word": "test", "influence": 0.3},
                    {"word": "email", "influence": 0.2}
                ],
                "timestamp": datetime.datetime.now().isoformat()
            }
        ]
    }
    
    # Save the report
    report_path = os.path.join(reports_dir, f"{batch_id}.pkl")
    with open(report_path, 'wb') as f:
        pickle.dump(report_data, f)
    
    print(f"Created test report at {report_path}")
    print(f"Batch ID: {batch_id}")
    return batch_id

if __name__ == "__main__":
    batch_id = create_test_report()
    print(f"Test report created with batch ID: {batch_id}")
    print(f"Access visualizations at: http://localhost:5001/visualizations")
    print(f"Enter the batch ID: {batch_id}")