import json
import os
import sqlite3
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

# Make ``bot/`` importable so we share storage + subscription detector with
# the Telegram bot rather than maintaining two parallel reads.
ROOT = Path(__file__).resolve().parents[1]
BOT_DIR = ROOT / "bot"
if str(BOT_DIR) not in sys.path:
    sys.path.insert(0, str(BOT_DIR))

import storage  # noqa: E402
import subscriptions  # noqa: E402
import reconcile  # noqa: E402

st.set_page_config(
    page_title="FineHance Omni | Command Center",
    page_icon="📊",
    layout="wide",
)

st.markdown(
    """
    <style>
    .main { background-color: #f8f9fa; }
    .stMetric {
        background-color: #ffffff;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .source-badge {
        display: inline-block; padding: 2px 8px; border-radius: 999px;
        font-size: 11px; font-weight: 600; color: white;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("📊 FineHance Omni — Command Center")
st.caption("Live view of every transaction the bot has captured: text, voice, vision, UPI screenshot, or bank-synced via Setu AA.")
st.markdown("---")


SOURCE_COLOURS = {
    "text": "#2563eb",
    "voice": "#9333ea",
    "image": "#f97316",
    "upi_screenshot": "#16a34a",
    "bank": "#dc2626",
}


@st.cache_data(ttl=5)
def load_all_data() -> dict[str, list[dict]]:
    return storage.load_expenses()


@st.cache_data(ttl=5)
def load_bank_accounts(user_id: str) -> list[dict]:
    return storage.list_bank_accounts(user_id)


data = load_all_data()

if not data:
    st.info("👋 No data yet! Start logging expenses via the Telegram Bot or run `/connect_bank` then `/sync` to pull bank transactions.")
else:
    user_ids = list(data.keys())
    selected_user = st.sidebar.selectbox("Select User ID", user_ids)

    if selected_user:
        df = pd.DataFrame(data[selected_user])
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df = df.sort_values("timestamp", ascending=False)

        # ---- Top metrics ------------------------------------------------
        total_spent = float(df["amount"].sum())
        avg_spent = float(df["amount"].mean()) if len(df) else 0.0
        num_tx = len(df)
        bank_count = int((df["source"] == "bank").sum())
        manual_count = num_tx - bank_count

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Spend", f"₹{total_spent:,.0f}")
        m2.metric("Average / Entry", f"₹{avg_spent:,.0f}")
        m3.metric("Transactions", num_tx)
        m4.metric("Bank-synced", f"{bank_count} / {num_tx}")

        # ---- Linked bank accounts ---------------------------------------
        accounts = load_bank_accounts(selected_user)
        if accounts:
            st.markdown("### 🏦 Linked Bank Accounts (Setu AA)")
            cols = st.columns(min(len(accounts), 3))
            for col, acc in zip(cols, accounts):
                with col:
                    st.write(
                        f"**{acc['fip_id']}** — `{acc['masked_acc_number'] or '???'}`  \n"
                        f"_{acc['acc_type'] or 'account'} • {acc['fi_type'] or 'DEPOSIT'}_  \n"
                        f"Last synced: `{acc['last_synced_at'] or 'never'}`"
                    )

        # ---- Charts -----------------------------------------------------
        st.markdown("### 📈 Spending Breakdown")
        c1, c2 = st.columns([1, 1])
        with c1:
            fig_pie = px.pie(
                df,
                values="amount",
                names="category",
                title="Expenses by Category",
                color_discrete_sequence=px.colors.qualitative.Pastel,
            )
            st.plotly_chart(fig_pie, use_container_width=True)
        with c2:
            df_daily = (
                df.assign(date=df["timestamp"].dt.date)
                .groupby("date")["amount"]
                .sum()
                .reset_index()
            )
            fig_line = px.line(
                df_daily,
                x="date",
                y="amount",
                title="Daily Spending Trend",
                markers=True,
            )
            st.plotly_chart(fig_line, use_container_width=True)

        # ---- Source mix -------------------------------------------------
        if df["source"].nunique() > 1:
            st.markdown("### 🌐 Where each expense came from")
            source_df = df.groupby("source")["amount"].agg(["count", "sum"]).reset_index()
            source_df.columns = ["source", "count", "total_amount"]
            source_df["color"] = source_df["source"].map(SOURCE_COLOURS).fillna("#64748b")
            fig_source = px.bar(
                source_df,
                x="source",
                y="count",
                hover_data=["total_amount"],
                color="source",
                title="Transactions by capture source",
                color_discrete_map=SOURCE_COLOURS,
            )
            st.plotly_chart(fig_source, use_container_width=True)

        # ---- Subscription detector --------------------------------------
        st.markdown("### 💸 Subscription / Vampire Detector")
        all_for_subs = storage.list_expenses(selected_user, include_merged=True)
        subs = subscriptions.detect_subscriptions(all_for_subs)
        if subs:
            sub_df = pd.DataFrame(
                [
                    {
                        "Merchant": s["merchant"],
                        "Cadence": s["cadence"],
                        "Avg amount": f"₹{s['average_amount']:,.0f}",
                        "Monthly cost": f"₹{s['monthly_cost']:,.0f}",
                        "Occurrences": s["occurrences"],
                        "Last seen": s["last_seen"][:10],
                        "Inactive (days)": s["inactivity_days"],
                        "Status": "🧛 Vampire" if s["vampire"] else "✅ Active",
                    }
                    for s in subs
                ]
            )
            total_sub = sum(s["monthly_cost"] for s in subs)
            st.warning(f"Detected **{len(subs)} recurring payments** costing **₹{total_sub:,.0f}/month**.")
            st.dataframe(sub_df, use_container_width=True, hide_index=True)
        else:
            st.info("No recurring payments detected yet — sync your bank or keep logging.")

        # ---- Transaction history ----------------------------------------
        st.markdown("### 📝 Transaction History")
        search = st.text_input("Search description, merchant, or category…")
        display_df = df.copy()
        if search:
            mask = (
                display_df["description"].astype(str).str.contains(search, case=False, na=False)
                | display_df["category"].astype(str).str.contains(search, case=False, na=False)
                | display_df.get("merchant", pd.Series([""] * len(display_df))).astype(str).str.contains(search, case=False, na=False)
            )
            display_df = display_df[mask]

        st.dataframe(
            display_df.drop(columns=["bank_account_id"], errors="ignore"),
            use_container_width=True,
            hide_index=True,
            column_config={
                "timestamp": "Date & Time",
                "amount": st.column_config.NumberColumn("Amount", format="₹%d"),
                "source": "Source",
                "merchant": "Merchant",
            },
        )

# ---- Sidebar utilities -------------------------------------------------
st.sidebar.markdown("---")
if st.sidebar.button("🔄 Refresh Data"):
    st.cache_data.clear()
    st.rerun()

st.sidebar.caption(f"DB: `{storage.DB_PATH}`")
