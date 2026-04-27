# FineHance Omni — Hackathon Demo Script

A 3 to 3.5-minute live demo arc designed to deliver eight distinct "wow" moments
to a judging panel. Every segment uses *real* code paths; the only synthetic
piece is the historical bank data, which comes from the Setu AA sandbox the
moment you supply credentials (and the in-process `MockSetuAAClient` until
then).

---

## Pre-demo checklist (5 minutes the night before)

- [ ] `cp .env.example .env` and fill `OPENAI_API_KEY` + `TELEGRAM_BOT_TOKEN`.
- [ ] (Optional) Sign up at https://bridge.setu.co/, enable **Account
      Aggregator** in sandbox, and paste `SETU_CLIENT_ID`,
      `SETU_CLIENT_SECRET`, `SETU_PRODUCT_INSTANCE_ID` into `.env`. Skip this
      and the bot will use the realistic in-process mock automatically.
- [ ] `pip install -r requirements.txt`.
- [ ] Start the bot in one terminal: `python bot/bot.py`.
- [ ] Start the dashboard in another: `streamlit run dashboard/app.py`.
- [ ] (Only if using real Setu) Start a tunnel for the webhook server:
      `uvicorn bot.setu.webhook:app --port 8000` and `cloudflared tunnel
      --url http://localhost:8000`. Paste the public URL into Setu Bridge.
- [ ] Open Telegram on your phone, the dashboard on your laptop, and screen
      share both.

---

## Act 1 — "It already understands you" (≈30 seconds)

| Step | What you do | What the audience sees |
|------|-------------|------------------------|
| 1 | `/start` | Friendly onboarding listing all commands. |
| 2 | Type **"Spent 250 on biryani and 400 on petrol"**. | Bot splits it into two expenses, categorises **Restaurants** + **Gas & Fuel**. *Wow #1: multi-expense parsing.* |
| 3 | Send a Malayalam (or any Indic) voice note. | Whisper transcribes, GPT-4o normalises, MiniLM categorises. *Wow #2: multilingual.* |
| 4 | Send a printed receipt photo. | Bot itemises every line. *Wow #3: vision + itemisation.* |

---

## Act 2 — "Now connect your real life" (≈60 seconds)

| Step | What you do | What the audience sees |
|------|-------------|------------------------|
| 5 | `/connect_bank` | Bot creates a Setu AA consent and replies with a tap-to-approve link. *Wow #4: regulated AA framework on stage.* |
| 6 | Tap the link, approve consent on Setu's hosted UI (sandbox auto-approves). | Real AA UX. |
| 7 | `/sync` | Bot pulls 90 days of transactions, MiniLM categorises every line, dedup auto-merges any manual entries that match bank txns. *Wow #5: bank-grade integration.* |

> **Live UPI moment:** during Act 2 ask a judge for any UPI VPA, pay them ₹1
> from any UPI app, take a screenshot of the success screen, and send it to
> the bot. GPT-4o vision parses the amount, recipient, ref id, and the bot
> logs it within 3 seconds — fully user-controlled, no SMS access, no extra
> apps. *Wow #6: live capture, audited.*

---

## Act 3 — "And now I'll save you money" (≈90 seconds)

| Step | What you do | What the audience sees |
|------|-------------|------------------------|
| 8 | `/subscriptions` | Vampire detector lists Netflix / Spotify / Hotstar / Cult.fit with cadence, monthly cost, and inactivity flag. *Wow #7: prescriptive, specific.* |
| 9 | `/insights` | GPT-4o ingests the merged 90-day dataset and returns concrete savings advice in ₹/month. *Wow #8.* |
| 10 | Switch screens to the Streamlit dashboard. | Pie + line + source-mix charts, linked-account cards, full searchable table — proves the ecosystem. |

---

## Closing line (≈10 seconds)

> "Built in 8 hours. Fine-tuned MiniLM categoriser at 96% accuracy. Setu
> Account Aggregator integration. Multimodal capture in three Indian
> languages. This is what every Indian needs."

---

## Commands cheat sheet

| Command | Purpose |
|---------|---------|
| `/start` | Welcome + capability tour. |
| `/connect_bank [vua]` | Create a Setu AA consent. |
| `/sync` | Pull latest bank transactions and categorise. |
| `/subscriptions` | List recurring "vampire" payments. |
| `/reconcile` | Merge manual logs that match bank entries. |
| `/summary` | Pie chart + AI-generated summary. |
| `/insights` | Free-form AI advice on the last 90 days. |
| `/dashboard` | Link to the local Streamlit dashboard. |

Plain text, voice notes, and photos are all handled implicitly.
