import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, ChevronDown, Maximize2, Minimize2, Sparkles } from "lucide-react";
import { useTelegramBot, type ChatMessage } from "../hooks/useTelegramBot";

export default function TelegramChatBar() {
  const [input, setInput] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { messages, sendMessage, isLoading } = useTelegramBot();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0) setIsPanelOpen(true);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
    setIsPanelOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2">
      {/* Hover Chat Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute bottom-[56px] left-0 right-0 flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_-4px_24px_rgba(15,23,42,0.06)] ${
              isExpanded ? "h-[500px]" : "h-[320px]"
            } transition-[height] duration-200`}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-200/70 bg-[#FAFAF9] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                  <Sparkles size={11} />
                </div>
                <span className="text-[13px] font-semibold text-slate-900">Vivien</span>
                {messages.length > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-bold text-white">
                    {messages.length}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsExpanded((e) => !e)}
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:text-slate-900"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 transition hover:text-slate-900"
                  title="Minimize"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#FAFAF9] p-4">
              {messages.length === 0 ? (
                <div className="mt-10 text-center text-[13px] italic text-slate-400">
                  Ask about your finances, spending, or budgets...
                </div>
              ) : (
                messages.map((msg: ChatMessage) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-xl border px-3.5 py-2.5 ${
                      msg.role === "user"
                        ? "self-end rounded-br-sm border-slate-200 bg-slate-900 text-white"
                        : "self-start rounded-bl-sm border-slate-200/80 bg-white"
                    }`}
                  >
                    {msg.role === "bot" && (
                      <span className="mb-1 block text-[10px] font-bold tracking-wider text-indigo-500">
                        Vivien
                      </span>
                    )}
                    <p className={`m-0 text-[13px] leading-relaxed ${msg.role === "user" ? "text-white" : "text-slate-700"}`}>
                      {msg.text}
                    </p>
                    <span className={`mt-1 block text-right text-[10px] ${msg.role === "user" ? "text-slate-400" : "text-slate-400"}`}>
                      {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="max-w-[80%] self-start rounded-xl rounded-bl-sm border border-slate-200/80 bg-white px-3.5 py-2.5">
                  <span className="mb-1 block text-[10px] font-bold tracking-wider text-indigo-500">
                    Vivien
                  </span>
                  <div className="typing-dots flex gap-1 py-1">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input Bar */}
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] focus-within:border-indigo-500/30 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:shadow-[0_4px_16px_rgba(99,102,241,0.06)]">
        <Sparkles size={14} className="shrink-0 text-indigo-500" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => messages.length > 0 && setIsPanelOpen(true)}
          placeholder="Ask Vivien anything..."
          disabled={isLoading}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
        />
        {input && (
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        )}
        {!isPanelOpen && messages.length > 0 && (
          <button
            onClick={() => setIsPanelOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            {messages.length} messages
          </button>
        )}
      </div>
    </div>
  );
}
