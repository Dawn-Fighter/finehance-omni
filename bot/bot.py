import asyncio
import logging
import os
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from telegram.helpers import escape_markdown
from dotenv import load_dotenv

from ai_processor import (
    extract_expense_details,
    extract_expense_items,
    extract_from_image,
    extract_from_receipt,
    transcribe_voice,
    generate_insights,
    generate_summary_insight,
)
from categorizer import get_category
import reconcile
import storage
import subscriptions
from setu.client import get_default_client
from setu.sync import run_full_sync
from utils import build_summary_stats, generate_pie_chart

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _format_amount(amount):
    return f"{amount:,.0f}" if float(amount).is_integer() else f"{amount:,.2f}"


def _md(text):
    """Escape user-supplied text for Telegram Markdown (legacy mode)."""
    return escape_markdown(str(text or ""), version=1)


def log_expense_items(user_id, items, source):
    logged = []
    for item in items:
        amount = item.get("amount", 0)
        description = item.get("description", "")
        if amount <= 0 or not description:
            continue
        category = get_category(description)
        storage.save_expense(user_id, amount, category, description, source=source)
        logged.append({
            "amount": amount,
            "category": category,
            "description": description,
        })
    return logged


def build_logged_message(logged, prefix="✅ Logged"):
    if len(logged) == 1:
        item = logged[0]
        return (
            f"{prefix} ₹{_format_amount(item['amount'])} under **{_md(item['category'])}**\n"
            f"📝 *{_md(item['description'])}*"
        )

    lines = [f"✅ Logged {len(logged)} expenses:"]
    for item in logged:
        lines.append(
            f"• ₹{_format_amount(item['amount'])} - **{_md(item['category'])}** - {_md(item['description'])}"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Command + message handlers
# ---------------------------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_text(
        f"👋 Hello {user.first_name}! Welcome to **FineHance Omni**.\n\n"
        "I'm your frictionless financial assistant. You can:\n"
        "🎙️ Send a voice note (e.g., 'Spent 500 on dinner')\n"
        "👁️ Send a photo of a receipt or a UPI success screenshot\n"
        "💬 Type your expense\n\n"
        "Bank-grade extras:\n"
        "🏦 /connect\\_bank — link an account via Setu Account Aggregator\n"
        "🔄 /sync — pull the latest bank transactions\n"
        "💸 /subscriptions — find recurring 'vampire' payments\n"
        "🧠 /insights — AI-powered spending tips\n"
        "📊 /summary — visual snapshot",
        parse_mode='Markdown'
    )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text.startswith('/'):
        return

    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="typing")

    items = extract_expense_items(text)
    logged = log_expense_items(update.effective_user.id, items, source="text")
    if logged:
        await update.message.reply_text(build_logged_message(logged), parse_mode='Markdown')
    else:
        await update.message.reply_text("🤔 I couldn't catch the amount. Try saying something like 'Spent 500 on coffee'.")


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="record_voice")

    voice_file = await update.message.voice.get_file()
    os.makedirs("assets", exist_ok=True)
    file_path = f"assets/{update.effective_user.id}_{update.message.message_id}.ogg"
    await voice_file.download_to_drive(file_path)

    text = transcribe_voice(file_path)
    if not text:
        await update.message.reply_text("❌ Sorry, I couldn't understand the audio.")
        return

    items = extract_expense_items(text)
    logged = log_expense_items(update.effective_user.id, items, source="voice")
    if logged:
        await update.message.reply_text(
            f"🎙️ Heard: \"{_md(text)}\"\n"
            f"{build_logged_message(logged)}",
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(f"🎙️ I heard: \"{_md(text)}\"\nBut I couldn't find an amount. Try again?")


async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="upload_photo")

    photo_file = await update.message.photo[-1].get_file()
    os.makedirs("assets", exist_ok=True)
    file_path = f"assets/{update.effective_user.id}_{update.message.message_id}.jpg"
    await photo_file.download_to_drive(file_path)

    data = extract_from_image(file_path)
    kind = data.get("kind")
    amount = float(data.get("amount") or 0)

    if amount <= 0:
        await update.message.reply_text(
            "❌ I couldn't read that image. Make sure the amount is clearly visible."
        )
        return

    description = data.get("description") or "Expense"
    merchant = data.get("merchant")
    recipient_vpa = data.get("recipient_vpa")
    txn_ref = data.get("txn_ref")
    txn_date = data.get("txn_date")
    items = data.get("items") or []

    if kind == "upi":
        # UPI screenshots: use Transfers if it's clearly a person-to-person send,
        # otherwise let the categorizer infer (e.g. UPI to Swiggy → Food Delivery).
        category_basis = " ".join(filter(None, [merchant or "", description or ""]))
        category = get_category(category_basis)
        if category == "Other" and recipient_vpa:
            category = "Transfers"

        storage.save_expense(
            update.effective_user.id,
            amount,
            category,
            description,
            source="upi_screenshot",
            timestamp=txn_date,
            merchant=merchant,
            bank_txn_id=txn_ref,
        )
        ref_line = f"\n🧾 Ref: `{_md(txn_ref)}`" if txn_ref else ""
        recipient_line = f"\n💌 To: `{_md(recipient_vpa)}`" if recipient_vpa else ""
        await update.message.reply_text(
            f"📲 *UPI payment detected*\n"
            f"✅ Logged ₹{_format_amount(amount)} under **{_md(category)}**\n"
            f"📝 *{_md(description)}*"
            f"{recipient_line}{ref_line}",
            parse_mode='Markdown'
        )
        return

    if kind == "receipt" and len(items) >= 2:
        # Itemise: log each line as its own expense for accurate categorisation.
        logged = []
        for it in items:
            it_amount = float(it.get("amount") or 0)
            it_name = (it.get("name") or "").strip()
            if it_amount <= 0 or not it_name:
                continue
            it_category = get_category(it_name)
            storage.save_expense(
                update.effective_user.id,
                it_amount,
                it_category,
                it_name,
                source="image",
                timestamp=txn_date,
                merchant=merchant,
            )
            logged.append({"amount": it_amount, "category": it_category, "description": it_name})
        if logged:
            header = f"🧾 Receipt from *{_md(merchant)}*" if merchant else "🧾 Receipt scanned"
            await update.message.reply_text(
                f"{header}\n{build_logged_message(logged)}",
                parse_mode='Markdown'
            )
            return

    # Fallback: single-line receipt or bank-txn screenshot.
    category = get_category(description)
    storage.save_expense(
        update.effective_user.id,
        amount,
        category,
        description,
        source="image",
        timestamp=txn_date,
        merchant=merchant,
    )
    label = "🧾 Receipt" if kind == "receipt" else "🖼️ Image"
    await update.message.reply_text(
        f"{label} scanned!\n"
        f"✅ Logged ₹{_format_amount(amount)} under **{_md(category)}**\n"
        f"📝 *{_md(description)}*",
        parse_mode='Markdown'
    )


async def summary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="upload_photo")
    user_id = update.effective_user.id
    expenses = storage.list_expenses(user_id)
    if not expenses:
        await update.message.reply_text("📉 No data yet! Log some expenses first to see your summary.")
        return

    chart_path = generate_pie_chart(update.effective_user.id)
    if chart_path and os.path.exists(chart_path):
        stats = build_summary_stats(expenses)
        advice = generate_summary_insight(stats)
        with open(chart_path, 'rb') as chart_file:
            await update.message.reply_photo(
                photo=chart_file,
                caption="📊 **Your Financial Snapshot**",
                parse_mode='Markdown'
            )
        await update.message.reply_text(f"🧠 **AI Summary**\n\n{advice}", parse_mode='Markdown')
    else:
        await update.message.reply_text("📉 No data yet! Log some expenses first to see your summary.")


async def insights(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    expenses = storage.list_expenses(user_id)

    if len(expenses) < 3:
        await update.message.reply_text("📉 I need at least 3 expenses to give you meaningful insights. Keep logging!")
        return

    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="typing")

    advice = generate_insights(expenses)
    await update.message.reply_text(f"🧠 **AI Financial Insights**\n\n{advice}", parse_mode='Markdown')


async def dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🖥️ **Your Command Center**\n"
        "View your full financial analytics here:\n"
        "🔗 [Open Dashboard](http://localhost:8501)\n\n"
        "*(Note: Ensure the dashboard is running locally during the demo)*",
        parse_mode='Markdown'
    )


# ---------------------------------------------------------------------------
# Setu Account Aggregator commands
# ---------------------------------------------------------------------------

async def connect_bank(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    args = context.args or []
    vua = args[0] if args else f"{user.id}@setu"

    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="typing")

    client = get_default_client()
    try:
        consent = client.create_consent(vua=vua)
    except Exception as exc:
        logger.exception("Setu consent failed")
        await update.message.reply_text(f"❌ Couldn't reach Setu: `{_md(exc)}`", parse_mode='Markdown')
        return

    consent_id = consent.get("id")
    consent_url = consent.get("url")
    if not consent_id or not consent_url:
        await update.message.reply_text("❌ Setu returned no consent URL.")
        return

    storage.upsert_consent(consent_id, user.id, consent.get("status", "PENDING"), consent_url)

    # Mock client returns linkedAccounts inline for the demo flow; real Setu
    # delivers them via webhook on ACTIVE.
    for acc in consent.get("linkedAccounts", []) or []:
        storage.upsert_bank_account(
            link_ref=acc.get("linkRefNumber"),
            user_id=user.id,
            consent_id=consent_id,
            fip_id=acc.get("fipId", ""),
            fi_type=acc.get("fiType"),
            acc_type=acc.get("accType"),
            masked_acc_number=acc.get("maskedAccNumber"),
        )

    await update.message.reply_text(
        "🏦 *Connect your bank account*\n\n"
        f"Tap to approve: [Open consent screen]({consent_url})\n\n"
        "Once approved, run /sync to pull your transactions.",
        parse_mode='Markdown',
        disable_web_page_preview=True,
    )


async def sync_bank(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    client = get_default_client()

    # Look for any consent we have for this user; if it's PENDING, ask Setu
    # for the latest status (mock + sandbox both flip to ACTIVE quickly).
    consents = storage.list_active_consents(user_id)
    if not consents:
        # Pull every consent the storage layer has and try to upgrade them.
        all_consents = []
        with storage._connect() as conn:  # noqa: SLF001  (internal helper, fine here)
            rows = conn.execute(
                "SELECT * FROM consents WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
                (str(user_id),),
            ).fetchall()
            all_consents = [dict(r) for r in rows]
        for c in all_consents:
            try:
                latest = client.get_consent(c["id"])
                storage.upsert_consent(c["id"], user_id, latest.get("status", c["status"]))
            except Exception as exc:
                logger.warning("Refresh consent %s failed: %s", c["id"], exc)
        consents = storage.list_active_consents(user_id)

    if not consents:
        await update.message.reply_text(
            "ℹ️ No active bank consents. Run /connect\\_bank first.",
            parse_mode='Markdown',
        )
        return

    consent = consents[0]
    consent_id = consent["id"]

    await update.message.reply_text(
        "🔄 *Syncing your bank…*\n"
        "_Pulling 90 days of transactions and categorising with MiniLM_",
        parse_mode='Markdown',
    )

    client = get_default_client()
    try:
        counts = await asyncio.to_thread(
            run_full_sync,
            client,
            user_id,
            consent_id,
            categorizer=get_category,
        )
    except Exception as exc:
        logger.exception("Setu sync failed")
        await update.message.reply_text(f"❌ Sync failed: `{_md(exc)}`", parse_mode='Markdown')
        return

    # Auto-reconcile manual + bank duplicates immediately so the next /summary
    # is clean.
    pairs = reconcile.reconcile_user(user_id)

    msg = (
        f"✅ *Sync complete*\n"
        f"• Fetched: {counts['fetched']} transactions\n"
        f"• Saved: {counts['saved']} new\n"
        f"• Duplicates skipped: {counts['duplicates']}\n"
        f"• Income credits: {counts['credits']}\n"
        f"• Manual ↔ bank merges: {len(pairs)}"
    )
    await update.message.reply_text(msg, parse_mode='Markdown')


async def show_subscriptions(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    expenses = storage.list_expenses(user_id, include_merged=True)
    subs = subscriptions.detect_subscriptions(expenses)
    await update.message.reply_text(
        subscriptions.summarise_for_user(subs),
        parse_mode='Markdown',
    )


async def run_reconcile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    pairs = reconcile.reconcile_user(user_id)
    await update.message.reply_text(
        reconcile.summarise_for_user(pairs),
        parse_mode='Markdown',
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    if not TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not found in environment variables.")
    else:
        application = ApplicationBuilder().token(TOKEN).build()

        application.add_handler(CommandHandler('start', start))
        application.add_handler(CommandHandler('summary', summary))
        application.add_handler(CommandHandler('insights', insights))
        application.add_handler(CommandHandler('dashboard', dashboard))
        application.add_handler(CommandHandler('connect_bank', connect_bank))
        application.add_handler(CommandHandler('sync', sync_bank))
        application.add_handler(CommandHandler('subscriptions', show_subscriptions))
        application.add_handler(CommandHandler('reconcile', run_reconcile))
        application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
        application.add_handler(MessageHandler(filters.VOICE, handle_voice))
        application.add_handler(MessageHandler(filters.PHOTO, handle_image))

        logger.info("Bot started...")
        application.run_polling()
