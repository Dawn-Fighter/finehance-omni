import streamlit as st
import json
import pandas as pd
import plotly.express as px
import os

st.set_page_config(
    page_title="FineHance Omni | Command Center",
    page_icon="📊",
    layout="wide"
)

# Custom CSS for a professional look
st.markdown("""
    <style>
    .main {
        background-color: #f8f9fa;
    }
    .stMetric {
        background-color: #ffffff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    </style>
    """, unsafe_allow_html=True)

st.title("📊 FineHance Omni Dashboard")
st.markdown("---")

DATA_PATH = os.path.join(os.path.dirname(__file__), '../data/expenses.json')

def load_data():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, 'r') as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

data = load_data()

if not data:
    st.info("👋 No data yet! Start logging expenses via the Telegram Bot.")
else:
    # Sidebar selection
    user_ids = list(data.keys())
    selected_user = st.sidebar.selectbox("Select User ID", user_ids)
    
    if selected_user:
        df = pd.DataFrame(data[selected_user])
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Metrics
        total_spent = df['amount'].sum()
        avg_spent = df['amount'].mean()
        num_tx = len(df)
        
        m1, m2, m3 = st.columns(3)
        m1.metric("Total Spending", f"₹{total_spent:,.2f}")
        m2.metric("Average per Entry", f"₹{avg_spent:,.2f}")
        m3.metric("Total Records", num_tx)
        
        st.markdown("### 📈 Spending Breakdown")
        
        c1, c2 = st.columns([1, 1])
        with c1:
            fig_pie = px.pie(
                df, values='amount', names='category', 
                title="Expenses by Category",
                color_discrete_sequence=px.colors.qualitative.Pastel
            )
            st.plotly_chart(fig_pie, use_container_width=True)
            
        with c2:
            df_daily = df.groupby(df['timestamp'].dt.date)['amount'].sum().reset_index()
            fig_line = px.line(
                df_daily, x='timestamp', y='amount', 
                title="Daily Spending Trend",
                markers=True
            )
            st.plotly_chart(fig_line, use_container_width=True)
            
        st.markdown("### 📝 Transaction History")
        # Search/Filter
        search = st.text_input("Search description or category...")
        if search:
            display_df = df[df['description'].str.contains(search, case=False) | df['category'].str.contains(search, case=False)]
        else:
            display_df = df
            
        st.dataframe(
            display_df.sort_values('timestamp', ascending=False),
            use_container_width=True,
            column_config={
                "timestamp": "Date & Time",
                "amount": st.column_config.NumberColumn("Amount", format="₹%d"),
                "source": "Logged Via"
            }
        )

# Add a refresh button
if st.sidebar.button("🔄 Refresh Data"):
    st.rerun()
