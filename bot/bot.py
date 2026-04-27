import logging
import os
import asyncio
import base64
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from dotenv import load_dotenv

from ai_processor import extract_expense_details, transcribe_voice, extract_from_receipt
from categorizer import get_category
from utils import save_expense, generate_pie_chart

load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_text(
        f"👋 Hello {user.first_name}! Welcome to **FineHance Omni**.\n\n"
        "I am your frictionless financial assistant. You can:\n"
        "🎙️ Send a voice note (e.g., 'Spent 500 on dinner')\n"
        "👁️ Send a photo of a receipt\n"
        "💬 Type your expense\n\n"
        "Try saying: 'I spent 300 on pizza today'"
    )

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text.startswith('/'):
        return

    # Indicate typing
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="typing")
    
    details = extract_expense_details(text)
    if details.get('amount', 0) > 0:
        category = get_category(details['description'])
        save_expense(update.effective_user.id, details['amount'], category, details['description'], source="text")
        await update.message.reply_text(f"✅ Logged ₹{details['amount']} under **{category}**\n📝 *{details['description']}*")
    else:
        await update.message.reply_text("🤔 I couldn't catch the amount. Try saying something like 'Spent 500 on coffee'.")

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Indicate processing
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="record_voice")
    
    voice_file = await update.message.voice.get_file()
    os.makedirs("assets", exist_ok=True)
    file_path = f"assets/{update.effective_user.id}_{update.message.message_id}.ogg"
    await voice_file.download_to_drive(file_path)
    
    text = transcribe_voice(file_path)
    if not text:
        await update.message.reply_text("❌ Sorry, I couldn't understand the audio.")
        return

    details = extract_expense_details(text)
    if details.get('amount', 0) > 0:
        category = get_category(details['description'])
        save_expense(update.effective_user.id, details['amount'], category, details['description'], source="voice")
        await update.message.reply_text(
            f"🎙️ Heard: \"{text}\"\n"
            f"✅ Logged ₹{details['amount']} under **{category}**"
        )
    else:
        await update.message.reply_text(f"🎙️ I heard: \"{text}\"\nBut I couldn't find an amount. Try again?")

async def handle_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Indicate processing
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="upload_photo")
    
    photo_file = await update.message.photo[-1].get_file()
    os.makedirs("assets", exist_ok=True)
    file_path = f"assets/{update.effective_user.id}_{update.message.message_id}.jpg"
    await photo_file.download_to_drive(file_path)
    
    details = extract_from_receipt(file_path)
    if details.get('amount', 0) > 0:
        category = get_category(details['description'])
        save_expense(update.effective_user.id, details['amount'], category, details['description'], source="image")
        await update.message.reply_text(
            f"👁️ Receipt Scanned!\n"
            f"✅ Logged ₹{details['amount']} under **{category}**\n"
            f"📝 *{details['description']}*"
        )
    else:
        await update.message.reply_text("❌ I couldn't extract the amount from this receipt. Make sure the total is clear.")

async def summary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_chat_action(chat_id=update.effective_message.chat_id, action="upload_photo")
    
    chart_path = generate_pie_chart(update.effective_user.id)
    if chart_path and os.path.exists(chart_path):
        await update.message.reply_photo(
            photo=open(chart_path, 'rb'), 
            caption="📊 **Your Financial Snapshot**\nHere is your spending breakdown by category."
        )
    else:
        await update.message.reply_text("📉 No data yet! Log some expenses first to see your summary.")

if __name__ == '__main__':
    if not TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not found in environment variables.")
    else:
        application = ApplicationBuilder().token(TOKEN).build()
        
        application.add_handler(CommandHandler('start', start))
        application.add_handler(CommandHandler('summary', summary))
        application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_text))
        application.add_handler(MessageHandler(filters.VOICE, handle_voice))
        application.add_handler(MessageHandler(filters.PHOTO, handle_image))
        
        logger.info("Bot started...")
        application.run_polling()
