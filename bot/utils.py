import json
import os
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), '../data/expenses.json')

def load_expenses():
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_expense(user_id, amount, category, description, source="text"):
    data = load_expenses()
    user_key = str(user_id)
    if user_key not in data:
        data[user_key] = []
    
    data[user_key].append({
        "amount": amount,
        "category": category,
        "description": description,
        "source": source,
        "timestamp": datetime.now().isoformat()
    })
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)
