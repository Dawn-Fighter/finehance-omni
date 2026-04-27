import requests
import os
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://api-inference.huggingface.co/models/CyberKunju/finehance-categorizer-minilm"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}

def get_category(text):
    if not text:
        return "Other"
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": text}, timeout=10)
        if response.status_code == 200:
            results = response.json()
            if isinstance(results, list) and len(results) > 0:
                # Handle different HF response formats
                # Usually it's a list of lists of dicts: [[{'label': 'X', 'score': 0.9}, ...]]
                predictions = results[0] if isinstance(results[0], list) else results
                top_prediction = max(predictions, key=lambda x: x['score'])
                return top_prediction['label']
        else:
            print(f"HF API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error calling HF Categorizer: {e}")
    return "Other"
