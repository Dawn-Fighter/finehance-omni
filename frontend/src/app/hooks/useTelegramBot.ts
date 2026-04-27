import { useState, useEffect, useRef, useCallback } from "react";

export interface ChatMessage {
  id: number;
  role: "user" | "bot";
  text: string;
  ts: Date;
}

interface TelegramBotResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID ?? "";
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function useTelegramBot(): TelegramBotResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastUpdateId = useRef(0);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 20;

    pollInterval.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        if (pollInterval.current) clearInterval(pollInterval.current);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${BASE_URL}/getUpdates?offset=${lastUpdateId.current + 1}&limit=5&timeout=2`
        );
        const data = await res.json();

        if (data.result && data.result.length > 0) {
          for (const update of data.result) {
            lastUpdateId.current = update.update_id;
            const msg = update.message || update.channel_post;
            if (msg && String(msg.chat.id) === String(CHAT_ID)) {
              if (msg.from?.is_bot) continue;

              setMessages((prev) => [
                ...prev,
                {
                  id: update.update_id,
                  role: "bot",
                  text: msg.text,
                  ts: new Date(msg.date * 1000),
                },
              ]);

              if (pollInterval.current) clearInterval(pollInterval.current);
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 500);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: Date.now(),
        role: "user",
        text,
        ts: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // If no bot token configured, simulate a bot response
      if (!BOT_TOKEN) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "bot",
              text: "I'm Vivien, your finance assistant. Telegram integration isn't configured yet — add VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID to your .env file to connect.",
              ts: new Date(),
            },
          ]);
          setIsLoading(false);
        }, 1200);
        return;
      }

      try {
        await fetch(`${BASE_URL}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: `Finehance Query: ${text}`,
            parse_mode: "Markdown",
          }),
        });
        startPolling();
      } catch (err) {
        console.error("Telegram send error:", err);
        setIsLoading(false);
      }
    },
    [startPolling]
  );

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  return { messages, sendMessage, isLoading };
}
