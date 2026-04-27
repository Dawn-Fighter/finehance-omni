import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line
} from "recharts";
import {
  Search, Bell, Plus, ArrowUpRight, ArrowDownRight,
  TrendingUp, Wallet, Target, MessageSquare, Mic, Receipt,
  ArrowRight, CheckCircle2, Sparkles, Bot, Send, Command,
  LayoutDashboard, ArrowLeftRight, PieChart, Settings,
  CircleDollarSign, Zap, Copy, Check, ChevronRight,
  Coffee, ShoppingBag, Building2, Briefcase, Cloud, Menu
} from "lucide-react";

// ─── Mock Data ──────────────────────────────────────────────────────────
const initialTransactions = [
  { id: "tx_101", merchant: "Stripe", category: "Software", amount: -299.0, time: "10:42 AM", source: "auto", status: "completed" },
  { id: "tx_102", merchant: "Acme Corp", subtitle: "Client payment", category: "Income", amount: 4500.0, time: "Yesterday", source: "auto", status: "completed" },
  { id: "tx_103", merchant: "Uber Eats", category: "Dining", amount: -42.5, time: "Yesterday", source: "receipt", status: "completed" },
  { id: "tx_104", merchant: "AWS Services", category: "Infrastructure", amount: -1240.2, time: "Oct 24", source: "auto", status: "completed" },
  { id: "tx_105", merchant: "Notion Labs", category: "Software", amount: -16.0, time: "Oct 23", source: "auto", status: "completed" },
];

const trendData = [
  { day: "Mon", balance: 14200, spent: 400 },
  { day: "Tue", balance: 14000, spent: 200 },
  { day: "Wed", balance: 18500, spent: 0 },
  { day: "Thu", balance: 18200, spent: 300 },
  { day: "Fri", balance: 16959, spent: 1241 },
  { day: "Sat", balance: 16917, spent: 42 },
  { day: "Sun", balance: 16618, spent: 299 },
];

const categoryData = [
  { name: "Infra", value: 1240, color: "#0F172A" },
  { name: "Software", value: 315, color: "#1E293B" },
  { name: "Dining", value: 247, color: "#475569" },
  { name: "Travel", value: 180, color: "#94A3B8" },
  { name: "Other", value: 95, color: "#CBD5E1" },
];

const budgets = [
  { label: "Software", spent: 315, total: 500 },
  { label: "Dining", spent: 247, total: 300 },
  { label: "Infrastructure", spent: 1240, total: 1000 },
];

const initialInsights = [
  { id: "ins_1", type: "alert", title: "AWS Spike Detected", content: "Your AWS bill is 40% higher than last month. RDS usage drove most of the increase.", action: "View breakdown", time: "2h" },
  { id: "ins_2", type: "success", title: "Cashflow Positive", content: "With Acme's payment cleared, you've passed monthly revenue target by 15%.", action: "Adjust targets", time: "1d" },
];

const sparkA = [12, 14, 13, 16, 15, 17, 18, 19].map((v, i) => ({ i, v }));
const sparkB = [8, 9, 7, 10, 11, 9, 8, 7].map((v, i) => ({ i, v }));
const sparkC = [4, 6, 5, 7, 8, 9, 11, 13].map((v, i) => ({ i, v }));
const sparkD = [3, 3, 4, 4, 3, 5, 5, 4].map((v, i) => ({ i, v }));

// ─── Component ──────────────────────────────────────────────────────────
export function Dashboard() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [insights, setInsights] = useState(initialInsights);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState("1W");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const telegramToken = "tg_auth_9x8f2p";

  useEffect(() => {
    const t = setTimeout(() => {
      const newTx = {
        id: "tx_" + Math.random().toString(36).slice(2, 9),
        merchant: "Starbucks",
        subtitle: "Voice log via Telegram",
        category: "Coffee",
        amount: -5.4,
        time: "Just now",
        source: "telegram",
        status: "processing",
      };
      setTransactions(prev => [newTx, ...prev]);

      setTimeout(() => {
        setInsights(prev => [{
          id: "ins_" + Math.random().toString(36).slice(2, 9),
          type: "info",
          title: "Voice Expense Categorized",
          content: "$5.40 at Starbucks → Coffee. You've spent $45 on coffee this week, up 12%.",
          action: "Review budget",
          time: "now",
        }, ...prev]);
        setTransactions(prev => prev.map(tx => tx.id === newTx.id ? { ...tx, status: "completed" } : tx));
      }, 2500);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const copyToken = () => {
    navigator.clipboard?.writeText(`/start ${telegramToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-900 selection:bg-slate-900 selection:text-white">
      <div className="flex">
        {/* ─── Sidebar ─── */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 64 : 224 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/70 bg-white/60 px-3 py-5 lg:flex"
        >
          <div className={`flex items-center gap-2 px-2 pb-6 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
              <CircleDollarSign size={15} />
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="leading-tight"
              >
                <div className="text-[13px] font-semibold tracking-tight">Finehance</div>
                <div className="text-[10px] text-slate-400">Personal · Pro</div>
              </motion.div>
            )}
          </div>

          <nav className="flex flex-col gap-0.5 text-[13px]">
            <NavItem icon={<LayoutDashboard size={14} />} label="Overview" active collapsed={sidebarCollapsed} />
            <NavItem icon={<ArrowLeftRight size={14} />} label="Transactions" badge="142" collapsed={sidebarCollapsed} />
            <NavItem icon={<PieChart size={14} />} label="Analytics" collapsed={sidebarCollapsed} />
            <NavItem icon={<Target size={14} />} label="Budgets" collapsed={sidebarCollapsed} />
            <NavItem icon={<Briefcase size={14} />} label="Invoices" badge="2" collapsed={sidebarCollapsed} />
            <div className="my-3 h-px bg-slate-200/70" />
            <NavItem icon={<Bot size={14} />} label="Analyst AI" collapsed={sidebarCollapsed} />
            <NavItem icon={<Settings size={14} />} label="Settings" collapsed={sidebarCollapsed} />
          </nav>

          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-auto rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Bot streaming
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                Whisper + GPT-4o Vision pipelines online.
              </p>
            </motion.div>
          )}
        </motion.aside>

        {/* ─── Main column ─── */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/70 bg-[#FAFAF9]/85 px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:text-slate-900 lg:block"
              >
                <Menu size={14} />
              </button>
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span className="text-slate-400">Workspace</span>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="font-medium text-slate-900">Overview</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search merchants, categories…"
                  className="h-8 w-72 rounded-md border border-slate-200 bg-white pl-8 pr-12 text-xs placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
                />
                <kbd className="absolute right-2 top-1/2 flex h-5 -translate-y-1/2 items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-500">
                  <Command size={9} /> K
                </kbd>
              </div>
              <button className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:text-slate-900">
                <Bell size={14} />
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-700">
                <Plus size={13} /> New entry
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold">
                JD
              </div>
            </div>
          </header>

          <main className="px-6 py-6">
            {/* Greeting */}
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  Monday · Apr 27, 2026
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  Good afternoon, Jordan.
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  You're <span className="font-medium text-emerald-600">+$1,288 ahead</span> of last week. Three budgets need attention.
                </p>
              </div>
              <div className="hidden items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5 md:flex">
                {["1W", "1M", "3M", "YTD"].map(p => (
                  <button
                    key={p}
                    onClick={() => setRange(p)}
                    className={`rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition ${range === p ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI strip */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat title="Total Balance" value="$16,618.00" trend="+12.5%" up data={sparkA} accent="#0F172A" />
              <Stat title="Monthly Spent" value="$2,842.50" trend="-2.4%" up data={sparkB} accent="#0F172A" />
              <Stat title="Revenue MTD" value="$8,500.00" trend="+18.2%" up data={sparkC} accent="#059669" />
              <Stat title="Pending Invoices" value="$3,200.00" trend="2 due" data={sparkD} accent="#B45309" muted />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="space-y-5 xl:col-span-2">
                {/* Cashflow + Category split */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                  <Panel className="lg:col-span-3">
                    <PanelHeader
                      title="Cashflow"
                      subtitle="Daily balance · last 7 days"
                      right={
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <Legend dot="#0F172A" label="Balance" />
                          <Legend dot="#94A3B8" label="Spend" />
                        </div>
                      }
                    />
                    <div className="h-60 px-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0F172A" stopOpacity={0.14} />
                              <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} dy={6} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={v => `$${v / 1000}k`} width={40} />
                          <Tooltip
                            cursor={{ stroke: "#E2E8F0", strokeDasharray: 3 }}
                            contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 6px 20px rgba(15,23,42,0.06)", fontSize: 11, padding: "6px 10px" }}
                            labelStyle={{ color: "#64748B", fontWeight: 500 }}
                            formatter={(v: number) => [fmt(v), "Balance"]}
                          />
                          <Area type="monotone" dataKey="balance" stroke="#0F172A" strokeWidth={1.75} fill="url(#g1)" />
                          <Line type="monotone" dataKey="spent" stroke="#94A3B8" strokeWidth={1.25} strokeDasharray="3 3" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel className="lg:col-span-2">
                    <PanelHeader title="By Category" subtitle="This week" />
                    <div className="h-40 px-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} margin={{ top: 5, right: 0, left: -16, bottom: 0 }} barSize={18}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: "#F1F5F9" }}
                            contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 11, padding: "6px 10px" }}
                            formatter={(v: number) => [fmt(v), "Spent"]}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {categoryData.map(c => <Cell key={c.name} fill={c.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {categoryData.slice(0, 3).map(c => (
                        <div key={c.name} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-2 text-slate-600">
                            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                            {c.name}
                          </span>
                          <span className="font-medium text-slate-900">{fmt(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>

                {/* Transactions */}
                <Panel padding="0">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <h2 className="flex items-center gap-2 text-[13px] font-semibold">
                        Live Transactions
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                      </h2>
                      <p className="mt-0.5 text-[11px] text-slate-500">Streaming from Telegram + auto-sync</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900">All</button>
                      <button className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-900">Income</button>
                      <button className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-900">Expense</button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    <AnimatePresence initial={false}>
                      {transactions.map(tx => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, height: 0, backgroundColor: "#F8FAFC" }}
                          animate={{ opacity: 1, height: "auto", backgroundColor: "#FFFFFF" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="group flex items-center justify-between px-5 py-3 transition hover:bg-slate-50/70"
                        >
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={tx.category} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-[13px] font-medium text-slate-900">{tx.merchant}</span>
                                {tx.status === "processing" && (
                                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 ring-1 ring-amber-100">
                                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="block h-2 w-2 rounded-full border-[1.5px] border-amber-500 border-t-transparent" />
                                    PROCESSING
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>{tx.category}</span>
                                <Dot />
                                <span>{tx.time}</span>
                                {tx.source === "telegram" && (<><Dot /><span className="flex items-center gap-1 font-medium text-sky-600"><MessageSquare size={9} /> Telegram</span></>)}
                                {tx.source === "receipt" && (<><Dot /><span className="flex items-center gap-1 font-medium text-violet-600"><Receipt size={9} /> Receipt</span></>)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-[13px] font-semibold tabular-nums ${tx.amount > 0 ? "text-emerald-600" : "text-slate-900"}`}>
                              {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)}
                            </div>
                            <ChevronRight size={14} className="text-slate-300 transition group-hover:text-slate-600" />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
                    <span className="text-[11px] text-slate-500">{transactions.length} of 142 entries</span>
                    <button className="text-[11px] font-medium text-slate-600 hover:text-slate-900">View all →</button>
                  </div>
                </Panel>

                {/* Budgets */}
                <Panel>
                  <PanelHeader title="Budget Health" subtitle="Auto-adjusted by ML model" right={<span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">v3.2</span>} />
                  <div className="space-y-3">
                    {budgets.map(b => {
                      const pct = Math.min(100, (b.spent / b.total) * 100);
                      const over = b.spent > b.total;
                      return (
                        <div key={b.label}>
                          <div className="mb-1.5 flex items-center justify-between text-[12px]">
                            <span className="font-medium text-slate-700">{b.label}</span>
                            <span className="tabular-nums text-slate-500">
                              <span className={`font-semibold ${over ? "text-rose-600" : "text-slate-900"}`}>{fmt(b.spent)}</span> / {fmt(b.total)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${over ? "bg-rose-500" : "bg-slate-900"}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>

              {/* Right rail */}
              <div className="space-y-5">
                {/* Telegram */}
                <Panel>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                        <Send size={13} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">Telegram Bot</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Quick capture</div>
                      </div>
                    </div>
                    {telegramLinked ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                        <CheckCircle2 size={10} /> Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-100">Pending</span>
                    )}
                  </div>

                  {!telegramLinked ? (
                    <>
                      <p className="mb-3 text-[12px] leading-relaxed text-slate-500">
                        Voice memos via Whisper, receipts via GPT-4o Vision, or one-line text logs.
                      </p>
                      <div className="mb-3 rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
                        <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-slate-400">Deep-link token</div>
                        <div className="flex items-center justify-between gap-2">
                          <code className="truncate rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-800">
                            /start {telegramToken}
                          </code>
                          <button onClick={copyToken} className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900">
                            {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                      <a
                        href={`https://t.me/Finehance_bot?start=${telegramToken}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setTimeout(() => setTelegramLinked(true), 1500)}
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 py-2 text-[12px] font-medium text-white transition hover:bg-slate-700"
                      >
                        <Send size={12} /> Open in Telegram
                      </a>
                      <div className="mt-3 grid grid-cols-3 gap-1.5">
                        <Capability icon={<Mic size={11} />} label="Voice" />
                        <Capability icon={<Receipt size={11} />} label="Receipt" />
                        <Capability icon={<MessageSquare size={11} />} label="Text" />
                      </div>
                    </>
                  ) : (
                    <div className="py-3 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="text-[13px] font-medium">Connected</div>
                      <p className="mx-auto mt-1 max-w-[220px] text-[11px] text-slate-500">
                        Try: "Spent $12 on lunch" — voice or text.
                      </p>
                    </div>
                  )}
                </Panel>

                {/* Analyst AI */}
                <Panel padding="0" className="flex h-[440px] flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
                        <Sparkles size={12} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">Analyst AI</div>
                        <div className="text-[10px] text-slate-400">Streaming insights</div>
                      </div>
                    </div>
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">GPT-4o</span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-white to-slate-50/40 p-4">
                    <AnimatePresence initial={false}>
                      {insights.map(ins => (
                        <motion.div
                          key={ins.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${ins.type === "alert" ? "bg-amber-500" : ins.type === "success" ? "bg-emerald-500" : "bg-sky-500"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 flex items-center justify-between gap-2">
                                <h4 className="truncate text-[12px] font-semibold text-slate-900">{ins.title}</h4>
                                <span className="text-[10px] text-slate-400">{ins.time}</span>
                              </div>
                              <p className="text-[11.5px] leading-relaxed text-slate-600">{ins.content}</p>
                              <button className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-700 hover:text-slate-900">
                                {ins.action} <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="border-t border-slate-100 bg-white p-3">
                    <div className="relative">
                      <Sparkles size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        placeholder="Ask the analyst…"
                        className="h-8 w-full rounded-md border border-slate-200 bg-slate-50/60 pl-7 pr-9 text-[12px] placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                      />
                      <button className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded bg-slate-900 text-white">
                        <Send size={10} />
                      </button>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────
function NavItem({ icon, label, active, badge, collapsed }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string, collapsed?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center rounded-md px-2.5 py-1.5 transition ${collapsed ? "justify-center" : "justify-between"} ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"}`}
      title={collapsed ? label : undefined}
    >
      <span className={`flex items-center gap-2.5 ${collapsed ? "" : ""}`}>
        <span className={active ? "text-white" : "text-slate-400"}>{icon}</span>
        {!collapsed && label}
      </span>
      {badge && !collapsed && <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{badge}</span>}
    </a>
  );
}

function Panel({ children, className = "", padding = "p-5" }: { children: React.ReactNode, className?: string, padding?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${padding === "0" ? "" : padding} ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ title, subtitle, right }: { title: string, subtitle?: string, right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Stat({ title, value, trend, up, data, accent, muted }: { title: string, value: string, trend: string, up?: boolean, data: { i: number, v: number }[], accent: string, muted?: boolean }) {
  return (
    <div className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{title}</span>
        <span className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${muted ? "bg-amber-50 text-amber-700" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {!muted && (up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />)}
          {trend}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-[22px] font-semibold tracking-tight tabular-nums text-slate-900">{value}</div>
        <div className="h-9 w-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sp-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} fill={`url(#sp-${title})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const map: Record<string, { icon: React.ReactNode, bg: string, fg: string }> = {
    Income: { icon: <TrendingUp size={13} />, bg: "bg-emerald-50", fg: "text-emerald-600" },
    Coffee: { icon: <Coffee size={13} />, bg: "bg-amber-50", fg: "text-amber-600" },
    Dining: { icon: <Coffee size={13} />, bg: "bg-amber-50", fg: "text-amber-600" },
    Software: { icon: <Zap size={13} />, bg: "bg-violet-50", fg: "text-violet-600" },
    Infrastructure: { icon: <Cloud size={13} />, bg: "bg-sky-50", fg: "text-sky-600" },
    Shopping: { icon: <ShoppingBag size={13} />, bg: "bg-rose-50", fg: "text-rose-600" },
  };
  const m = map[category] || { icon: <Wallet size={13} />, bg: "bg-slate-100", fg: "text-slate-600" };
  return <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${m.bg} ${m.fg} ring-1 ring-inset ring-slate-200/50`}>{m.icon}</div>;
}

function Dot() {
  return <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />;
}

function Legend({ dot, label }: { dot: string, label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

function Capability({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md border border-slate-200 bg-slate-50/60 py-2 text-[10px] font-medium text-slate-600">
      <span className="text-slate-500">{icon}</span>
      {label}
    </div>
  );
}
