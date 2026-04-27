from openai import OpenAI
import os
import json
import base64
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("LLM_MODEL", "gpt-4o")

def extract_expense_details(text):
    prompt = f"""
    Extract the amount and a short description of the expense from this text: "{text}"
    If the text is in Malayalam, Tamil, Telugu, or Kannada, translate the description to English.
    Return ONLY a JSON object with keys "amount" (number) and "description" (string).
    Example: {{"amount": 500, "description": "Pizza dinner"}}
    """
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error extracting expense details: {e}")
        return {"amount": 0, "description": text}

def transcribe_voice(file_path):
    try:
        with open(file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file
            )
            return transcript.text
    except Exception as e:
        print(f"Error transcribing voice: {e}")
        return ""

def extract_from_receipt(image_path):
    try:
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract the total amount and a brief summary of items from this receipt. Return ONLY JSON: {\"amount\": float, \"description\": string}"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ],
                }
            ],
            response_format={ "type": "json_object" }
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error extracting from receipt: {e}")
        return {"amount": 0, "description": "Receipt extraction failed"}

def generate_insights(expenses):
    try:
        expense_summary = "\n".join([f"- {e['amount']} on {e['category']} ({e['description']})" for e in expenses[-10:]])
        prompt = f"Analyze these recent expenses and give 3 short, professional financial tips. Be specific to the spending pattern if possible:\n{expense_summary}"
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating insights: {e}")
        return "Could not generate insights at this time."
