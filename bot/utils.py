import os
from datetime import datetime
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.ticker import FuncFormatter

import storage

# Re-export the storage helpers so callers (and tests) keep the old surface.
load_expenses = storage.load_expenses
save_expense = storage.save_expense

# Kept for legacy paths that still poke at the JSON file directly.
DATA_FILE = os.path.join(os.path.dirname(__file__), '../data/expenses.json')


def build_summary_stats(expenses):
    if not expenses:
        return {
            "total_spend": 0,
            "transaction_count": 0,
            "average_spend": 0,
            "top_category": "None",
            "category_totals": {},
            "daily_totals": {},
            "largest_expense": None,
            "recent_expenses": [],
        }

    normalized = []
    for expense in expenses:
        amount = float(expense.get("amount", 0) or 0)
        timestamp = expense.get("timestamp") or datetime.now().isoformat()
        normalized.append({
            **expense,
            "amount": amount,
            "category": expense.get("category") or "Other",
            "description": expense.get("description") or "Expense",
            "timestamp": timestamp,
        })

    df = pd.DataFrame(normalized)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["date"] = df["timestamp"].dt.date.astype(str)

    category_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    daily_totals = df.groupby("date")["amount"].sum().sort_index()
    largest = max(normalized, key=lambda item: item["amount"])
    recent = sorted(normalized, key=lambda item: item["timestamp"], reverse=True)[:5]

    return {
        "total_spend": float(df["amount"].sum()),
        "transaction_count": int(len(df)),
        "average_spend": float(df["amount"].mean()),
        "top_category": category_totals.index[0] if not category_totals.empty else "None",
        "category_totals": category_totals.to_dict(),
        "daily_totals": daily_totals.to_dict(),
        "largest_expense": largest,
        "recent_expenses": recent,
    }


def _rupee(value, _position=None):
    return f"Rs {value:,.0f}"


def generate_pie_chart(user_id):
    expenses = load_expenses().get(str(user_id), [])
    if not expenses:
        return None

    stats = build_summary_stats(expenses)
    if stats["transaction_count"] == 0:
        return None

    category_totals = pd.Series(stats["category_totals"]).sort_values(ascending=False)
    daily_totals = pd.Series(stats["daily_totals"])
    recent_expenses = stats["recent_expenses"][:4]

    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "axes.titleweight": "bold",
        "axes.labelcolor": "#475569",
        "xtick.color": "#64748b",
        "ytick.color": "#64748b",
    })

    fig = plt.figure(figsize=(14, 9), dpi=180)
    fig.patch.set_facecolor("#f8fafc")
    grid = fig.add_gridspec(3, 4, height_ratios=[0.8, 2.2, 1.8], hspace=0.58, wspace=0.44)

    ax_header = fig.add_subplot(grid[0, :])
    ax_header.axis("off")
    ax_header.text(0.0, 0.82, "FineHance Omni", fontsize=25, fontweight="bold", color="#0f172a")
    ax_header.text(0.0, 0.36, "AI-ready spending snapshot", fontsize=11, color="#64748b")
    ax_header.text(
        0.99,
        0.70,
        f"Total: Rs {stats['total_spend']:,.0f}",
        ha="right",
        fontsize=24,
        fontweight="bold",
        color="#166534",
    )
    ax_header.text(
        0.99,
        0.30,
        f"{stats['transaction_count']} txns  |  Avg Rs {stats['average_spend']:,.0f}  |  Top: {stats['top_category']}",
        ha="right",
        fontsize=11,
        color="#475569",
    )

    ax_donut = fig.add_subplot(grid[1, :2])
    colors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#dc2626", "#0f766e", "#64748b"]
    wedges, _texts, autotexts = ax_donut.pie(
        category_totals.values,
        labels=None,
        startangle=90,
        colors=colors[:len(category_totals)],
        autopct=lambda pct: f"{pct:.0f}%" if pct >= 8 else "",
        pctdistance=0.78,
        wedgeprops={"width": 0.42, "edgecolor": "#f8fafc", "linewidth": 3},
    )
    for autotext in autotexts:
        autotext.set_color("white")
        autotext.set_fontweight("bold")
        autotext.set_fontsize(9)
    ax_donut.set_title("Category Mix", loc="left", fontsize=15, color="#0f172a")
    ax_donut.legend(
        wedges,
        category_totals.index,
        loc="center left",
        bbox_to_anchor=(1.0, 0.5),
        frameon=False,
        fontsize=9,
    )

    ax_trend = fig.add_subplot(grid[1, 2:])
    ax_trend.set_title("Daily Spend", loc="left", fontsize=15, color="#0f172a")
    ax_trend.plot(daily_totals.index, daily_totals.values, color="#2563eb", linewidth=3, marker="o")
    ax_trend.fill_between(daily_totals.index, daily_totals.values, color="#dbeafe", alpha=0.8)
    ax_trend.yaxis.set_major_formatter(FuncFormatter(_rupee))
    ax_trend.grid(axis="y", color="#e2e8f0", linewidth=1)
    ax_trend.spines[["top", "right", "left"]].set_visible(False)
    ax_trend.tick_params(axis="x", rotation=15)

    ax_bars = fig.add_subplot(grid[2, :2])
    ax_bars.set_title("Top Categories", loc="left", fontsize=15, color="#0f172a")
    top_categories = category_totals.head(5).sort_values()
    ax_bars.barh(top_categories.index, top_categories.values, color="#16a34a", alpha=0.88)
    ax_bars.xaxis.set_major_formatter(FuncFormatter(_rupee))
    ax_bars.grid(axis="x", color="#e2e8f0", linewidth=1)
    ax_bars.spines[["top", "right", "left"]].set_visible(False)

    ax_recent = fig.add_subplot(grid[2, 2:])
    ax_recent.axis("off")
    ax_recent.set_title("Recent Activity", loc="left", fontsize=15, color="#0f172a")
    y = 0.82
    for expense in recent_expenses:
        ax_recent.text(0.02, y, expense["category"], fontsize=11, fontweight="bold", color="#0f172a")
        ax_recent.text(0.02, y - 0.13, expense["description"][:42], fontsize=9, color="#64748b")
        ax_recent.text(0.98, y, f"Rs {expense['amount']:,.0f}", ha="right", fontsize=12, fontweight="bold", color="#166534")
        y -= 0.22

    os.makedirs("assets", exist_ok=True)
    file_path = f"assets/{user_id}_summary.png"
    fig.savefig(file_path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return file_path
