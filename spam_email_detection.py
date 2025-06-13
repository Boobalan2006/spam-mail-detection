import streamlit as st
import requests
import pandas as pd
from sklearn.preprocessing import LabelEncoder
import numpy as np

# Set up title and page
st.title("Email Spam Detection App")

# Tabs for navigation
tab1, tab2 = st.tabs(["Analyze", "Insights"])

with tab1:
    st.header("Upload your Email Data for Analysis")
    
    uploaded_file = st.file_uploader("Choose a CSV file for analysis", type=["csv"])

    if uploaded_file is not None:
        # Load and display the data
        data = pd.read_csv(uploaded_file)
        st.write(data.head())

        # Prepare data for prediction
        # Assuming the input data has a 'Message' column
        message = data['Message'].apply(str)  # Convert messages to string

        # Send data to the backend for spam detection
        url = "http://localhost:5001/api/predict"  # Backend API URL
        response = requests.post(url, json={"messages": message.tolist()})

        if response.status_code == 200:
            prediction = response.json()
            st.write("Prediction results:", prediction)

            # Visualize results
            st.bar_chart(pd.Series(prediction['predictions']).value_counts())

with tab2:
    st.header("Insights on the Data")

    # Load the dataset from CSV
    if uploaded_file is not None:
        st.write("Data Overview:")
        st.write(data.describe())

        # Display insights about the data
        st.write("Most frequent words in spam messages")
        # Here, you'd add your code to analyze and visualize the most frequent words
