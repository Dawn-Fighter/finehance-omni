import json
import os
from datetime import datetime
import matplotlib.pyplot as plt
import pandas as pd

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

def generate_pie_chart(user_id):
    expenses = load_expenses().get(str(user_id), [])
    if not expenses:
        return None
    
    df = pd.DataFrame(expenses)
    if df.empty:
        return None
        
    category_totals = df.groupby('category')['amount'].sum()
    
    # Customizing for dark theme/professional look
    plt.style.use('ggplot')
    plt.figure(figsize=(10, 7))
    category_totals.plot(kind='pie', autopct='%1.1f%%', startangle=140, shadow=False)
    plt.title(f'Spending Breakdown for User {user_id}', fontsize=14)
    plt.ylabel('')
    
    os.makedirs("assets", exist_ok=True)
    file_path = f"assets/{user_id}_summary.png"
    plt.savefig(file_path, bbox_inches='tight')
    plt.close()
    return file_path
