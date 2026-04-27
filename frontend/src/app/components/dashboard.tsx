import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Zap, Copy, Check, ChevronRight, ChevronDown,
  Coffee, ShoppingBag, Building2, Briefcase, Cloud, Calendar,
  X
} from "lucide-react";
import InsightsPanel from "./InsightsPanel";
import TelegramChatBar from "./TelegramChatBar";
import { Outlet, useLocation, NavLink } from "react-router";

// ─── TypeScript Interfaces ──────────────────────────────────────────────
interface UserProfile {
  userId: string;
  coverPhotoUrl: string | null;
  systemIdentifier: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WeeklySpending {
  weekNumber: number;
  startDate: string;
  endDate: string;
  total: number;
  transactionCount: number;
  topCategories: { category: string; amount: number }[];
}

interface MonthlySpending {
  month: string;
  total: number;
  weeks: WeeklySpending[];
  expanded: boolean;
}

interface TransactionExtended {
  id: string;
  dateTime: Date;
  category: string;
  originEntity: string;
  destinationEntity: string;
  amount: number;
  status: "completed" | "pending" | "processing" | "failed";
  source: "auto" | "telegram" | "receipt" | "manual";
  metadata?: Record<string, any>;
}

interface MonthData {
  totalSpent: number;
  totalIncome: number;
  netCashflow: number;
  categoryBreakdown: Record<string, number>;
}

interface Anomaly {
  type: "increase" | "decrease" | "spike" | "leak";
  category: string;
  percentageChange: number;
  description: string;
  severity: "low" | "medium" | "high";
}

interface MonthlySummary {
  month: string;
  totalSpent: number;
  totalIncome: number;
  netCashflow: number;
  categoryBreakdown: Record<string, number>;
  comparisonToPreviousMonth: {
    spentChange: number;
    incomeChange: number;
    cashflowChange: number;
  };
  anomalies: Anomaly[];
  generatedAt: Date;
}

interface FixedLiability {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  recurring: boolean;
  frequency?: "monthly" | "quarterly" | "annual";
  category: "software" | "saas" | "subscription" | "utility";
  autoPayEnabled: boolean;
}

interface VariableLiability {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  description: string;
  contactInfo?: string;
}

interface Liabilities {
  fixed: FixedLiability[];
  variable: VariableLiability[];
  expanded: boolean;
}

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

// Mock data for new features
const mockUserProfile: UserProfile = {
  userId: "user_001",
  coverPhotoUrl: null,
  systemIdentifier: "@kashy_fin",
  displayName: "Jordan",
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date(),
};

const mockWeeklySpending: WeeklySpending[] = [
  { weekNumber: 17, startDate: "2026-04-20", endDate: "2026-04-26", total: 842.50, transactionCount: 12, topCategories: [{ category: "Dining", amount: 247 }] },
  { weekNumber: 16, startDate: "2026-04-13", endDate: "2026-04-19", total: 1200.00, transactionCount: 8, topCategories: [{ category: "Infrastructure", amount: 1240 }] },
  { weekNumber: 15, startDate: "2026-04-06", endDate: "2026-04-12", total: 800.00, transactionCount: 15, topCategories: [{ category: "Software", amount: 315 }] },
];

const mockMonthlySummary: MonthlySummary = {
  month: "2026-04",
  totalSpent: 2842.50,
  totalIncome: 8500.00,
  netCashflow: 5657.50,
  categoryBreakdown: {
    Infrastructure: 1240,
    Software: 315,
    Dining: 247,
    Travel: 180,
    Other: 95,
  },
  comparisonToPreviousMonth: {
    spentChange: -2.4,
    incomeChange: 18.2,
    cashflowChange: 12.5,
  },
  anomalies: [
    {
      type: "spike",
      category: "Infrastructure",
      percentageChange: 40,
      description: "AWS bill is 40% higher than last month",
      severity: "high",
    },
  ],
  generatedAt: new Date(),
};

const mockLiabilities: Liabilities = {
  fixed: [
    {
      id: "lib_001",
      name: "Stripe",
      amount: 299.00,
      dueDate: new Date("2026-05-01"),
      recurring: true,
      frequency: "monthly",
      category: "software",
      autoPayEnabled: true,
    },
    {
      id: "lib_002",
      name: "AWS Services",
      amount: 1240.20,
      dueDate: new Date("2026-04-30"),
      recurring: true,
      frequency: "monthly",
      category: "saas",
      autoPayEnabled: false,
    },
    {
      id: "lib_003",
      name: "Notion Labs",
      amount: 16.00,
      dueDate: new Date("2026-04-28"),
      recurring: true,
      frequency: "monthly",
      category: "subscription",
      autoPayEnabled: true,
    },
  ],
  variable: [
    {
      id: "lib_004",
      name: "John Doe",
      amount: 500.00,
      dueDate: new Date("2026-04-25"),
      description: "Dinner split from last week",
      contactInfo: "john@example.com",
    },
    {
      id: "lib_005",
      name: "Sarah Chen",
      amount: 1144.80,
      dueDate: new Date("2026-05-05"),
      description: "Conference ticket reimbursement",
      contactInfo: "+1 555-0123",
    },
  ],
  expanded: false,
};

// ─── UserProfileSuite Component ─────────────────────────────────────────
function UserProfileSuite({ profile, onEditProfile }: { profile: UserProfile; onEditProfile: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      {/* Cover Photo */}
      <div className="relative h-32 w-full overflow-hidden">
        {profile.coverPhotoUrl ? (
          <img
            src={profile.coverPhotoUrl}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="relative -mt-6 px-5 pb-4">
        <div className="flex items-end gap-3">
          {/* Avatar placeholder */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-white bg-slate-900 text-white shadow-lg">
            <span className="text-xl font-bold">{profile.displayName.charAt(0)}</span>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h2
                onClick={onEditProfile}
                className="cursor-pointer text-lg font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
              >
                {profile.displayName}
              </h2>
              <button
                onClick={onEditProfile}
                className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Edit profile"
              >
                <Settings size={12} />
              </button>
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">
              {profile.systemIdentifier}
            </div>
          </div>

          {/* Terminal indicator */}
          <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            TERMINAL ACTIVE
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── WeeklyBreakdown Component ──────────────────────────────────────────
function WeeklyBreakdown({
  weeks,
  onViewFullHistory,
}: {
  weeks: WeeklySpending[];
  onViewFullHistory: () => void;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const mo = (d: Date) => d.toLocaleString("en-US", { month: "short" });
    return `${mo(s)} ${s.getDate()} – ${mo(e)} ${e.getDate()}`;
  };

  const maxTotal = Math.max(...weeks.map((w) => w.total), 1);

  return (
    <div className="space-y-2">
      {weeks.map((week) => (
        <div
          key={week.weekNumber}
          className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
        >
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={11} className="text-slate-400" />
              <span className="font-medium">Week {week.weekNumber}</span>
              <span className="text-slate-400">
                {formatDateRange(week.startDate, week.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">
                {week.transactionCount} txns
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {fmt(week.total)}
              </span>
            </div>
          </div>
          {/* Mini bar */}
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(week.total / maxTotal) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full bg-slate-900"
            />
          </div>
        </div>
      ))}

      <button
        onClick={onViewFullHistory}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        View Full History <ArrowRight size={11} />
      </button>
    </div>
  );
}

// ─── Mock Deep Ledger Transactions ──────────────────────────────────────
const deepLedgerCategories = ["Infrastructure", "Software", "Dining", "Travel", "Coffee", "Shopping", "Income", "Utilities", "Entertainment", "Health"];
const deepLedgerOrigins = ["Jordan K.", "Acme Corp", "System Auto", "Telegram Bot", "Receipt Scan", "Manual Entry"];
const deepLedgerDestinations = ["AWS", "Stripe", "Notion Labs", "Uber Eats", "Starbucks", "Netflix", "Spotify", "GitHub", "Vercel", "DigitalOcean", "Google Cloud", "Slack", "Figma", "Linear", "Postman", "DoorDash", "Whole Foods", "Target", "Delta Airlines", "Hilton Hotels"];
const deepLedgerStatuses: TransactionExtended["status"][] = ["completed", "pending", "processing", "failed"];
const deepLedgerSources: TransactionExtended["source"][] = ["auto", "telegram", "receipt", "manual"];

function generateMockTransactions(count: number): TransactionExtended[] {
  const txns: TransactionExtended[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    const dt = new Date(now.getTime() - daysAgo * 86400000 - Math.random() * 86400000);
    const cat = deepLedgerCategories[i % deepLedgerCategories.length];
    const isIncome = cat === "Income";
    txns.push({
      id: `dl_${String(i).padStart(4, "0")}`,
      dateTime: dt,
      category: cat,
      originEntity: isIncome ? deepLedgerDestinations[i % deepLedgerDestinations.length] : deepLedgerOrigins[i % deepLedgerOrigins.length],
      destinationEntity: isIncome ? deepLedgerOrigins[i % deepLedgerOrigins.length] : deepLedgerDestinations[i % deepLedgerDestinations.length],
      amount: isIncome ? +(Math.random() * 5000 + 500).toFixed(2) : -(Math.random() * 1500 + 5).toFixed(2) as unknown as number,
      status: deepLedgerStatuses[i % deepLedgerStatuses.length],
      source: deepLedgerSources[i % deepLedgerSources.length],
    });
  }
  return txns.sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
}

const mockDeepLedgerTransactions = generateMockTransactions(60);

// ─── GhostTable Component ───────────────────────────────────────────────
function GhostTable({ transactions }: { transactions: TransactionExtended[] }) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const fmtDate = (d: Date) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const statusColor: Record<string, string> = {
    completed: "text-emerald-400",
    pending: "text-amber-400",
    processing: "text-sky-400",
    failed: "text-rose-400",
  };

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border border-slate-700/50">
      <table className="w-full min-w-[800px] text-left font-mono text-[11px]">
        <thead className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/95 backdrop-blur-sm">
          <tr>
            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">Date/Time</th>
            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">Category</th>
            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">Origin</th>
            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">Destination</th>
            <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-400">Amount</th>
            <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="opacity-40 transition-opacity hover:opacity-80"
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-300">{fmtDate(tx.dateTime)}</td>
              <td className="px-4 py-2.5 text-slate-300">{tx.category}</td>
              <td className="px-4 py-2.5 text-slate-300">{tx.originEntity}</td>
              <td className="px-4 py-2.5 text-slate-300">{tx.destinationEntity}</td>
              <td className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums ${tx.amount > 0 ? "text-emerald-400" : "text-slate-300"}`}>
                {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)}
              </td>
              <td className={`px-4 py-2.5 uppercase tracking-wider ${statusColor[tx.status] || "text-slate-400"}`}>
                {tx.status}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                No transactions match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── DeepLedger Component ───────────────────────────────────────────────
function DeepLedger({
  transactions,
  onClose,
}: {
  transactions: TransactionExtended[];
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return ["all", ...Array.from(cats).sort()];
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.category.toLowerCase().includes(q) ||
          t.originEntity.toLowerCase().includes(q) ||
          t.destinationEntity.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      );
    }
    return result;
  }, [transactions, categoryFilter, debouncedSearch]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h2 className="font-mono text-lg font-semibold text-slate-100">
            Deep Ledger
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500">
            {filtered.length} of {transactions.length} transactions · full history
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          aria-label="Close Deep Ledger"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter / Search controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800/60 px-6 py-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search transactions…"
            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 font-mono text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 rounded-md border border-slate-700 bg-slate-900 px-3 font-mono text-[12px] text-slate-300 focus:border-slate-500 focus:outline-none"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* GhostTable */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <GhostTable transactions={filtered} />
      </div>
    </motion.div>
  );
}

// ─── MonthlySpentCard Component ─────────────────────────────────────────
function MonthlySpentCard({
  value,
  trend,
  data,
  spending,
  onToggle,
  onViewFullHistory,
}: {
  value: string;
  trend: string;
  data: { i: number; v: number }[];
  spending: MonthlySpending;
  onToggle: () => void;
  onViewFullHistory: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer flex-col p-4 text-left"
        aria-expanded={spending.expanded}
        aria-controls="monthly-spent-expansion"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Monthly Spent
          </span>
          <div className="flex items-center gap-1.5">
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
            >
              <ArrowDownRight size={9} />
              {trend}
            </motion.span>
            <motion.span
              animate={{ rotate: spending.expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ChevronDown size={14} className="text-slate-400" />
            </motion.span>
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-[22px] font-semibold tracking-tight tabular-nums text-slate-900"
          >
            {value}
          </motion.div>
          <div className="h-9 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sp-Monthly-Spent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F172A" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#0F172A"
                  strokeWidth={1.5}
                  fill="url(#sp-Monthly-Spent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </button>

      {/* Accordion expansion */}
      <AnimatePresence initial={false}>
        {spending.expanded && (
          <motion.div
            id="monthly-spent-expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
              <WeeklyBreakdown
                weeks={spending.weeks}
                onViewFullHistory={onViewFullHistory}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Urgency Helper ─────────────────────────────────────────────────────
function getUrgency(dueDate: Date): "overdue" | "urgent" | "normal" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 7) return "urgent";
  return "normal";
}

// ─── PendingInvoicesCard Component ──────────────────────────────────────
function PendingInvoicesCard({
  liabilities,
  onToggle,
  onMarkPaid,
  fmt,
}: {
  liabilities: Liabilities;
  onToggle: () => void;
  onMarkPaid: (id: string) => void;
  fmt: (v: number) => string;
}) {
  const totalCount = liabilities.fixed.length + liabilities.variable.length;

  const urgencyStyles = (dueDate: Date) => {
    const u = getUrgency(dueDate);
    if (u === "overdue") return "border-rose-200 bg-rose-50 text-rose-700";
    if (u === "urgent") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-100 bg-white text-slate-700";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer flex-col p-4 text-left"
        aria-expanded={liabilities.expanded}
        aria-controls="pending-invoices-expansion"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Pending Invoices
          </span>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              {totalCount} due
            </span>
            <motion.span
              animate={{ rotate: liabilities.expanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ChevronDown size={14} className="text-slate-400" />
            </motion.span>
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-[22px] font-semibold tracking-tight tabular-nums text-slate-900"
          >
            $3,200.00
          </motion.div>
          <div className="h-9 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkD} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sp-Pending-Invoices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B45309" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#B45309" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#B45309" strokeWidth={1.5} fill="url(#sp-Pending-Invoices)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </button>

      {/* Accordion expansion */}
      <AnimatePresence initial={false}>
        {liabilities.expanded && (
          <motion.div
            id="pending-invoices-expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
              {/* Fixed Liabilities */}
              {liabilities.fixed.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Fixed Liabilities</div>
                  <div className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {liabilities.fixed.map((lib) => (
                        <motion.div
                          key={lib.id}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${urgencyStyles(lib.dueDate)}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-medium">{lib.name}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">{lib.category}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] opacity-70">
                              <span className="font-semibold tabular-nums">{fmt(lib.amount)}</span>
                              <span>Due {lib.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkPaid(lib.id); }}
                            className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            Mark Paid
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Variable Liabilities */}
              {liabilities.variable.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Variable Liabilities</div>
                  <div className="space-y-1.5">
                    <AnimatePresence initial={false}>
                      {liabilities.variable.map((lib) => (
                        <motion.div
                          key={lib.id}
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${urgencyStyles(lib.dueDate)}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium">{lib.name}</div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] opacity-70">
                              <span className="font-semibold tabular-nums">{fmt(lib.amount)}</span>
                              <span>Due {lib.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>
                            <div className="mt-0.5 text-[10px] opacity-60">{lib.description}</div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkPaid(lib.id); }}
                            className="shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                          >
                            Mark Paid
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export function Dashboard() {
  const location = useLocation();
  
  const pageTitle = useMemo(() => {
    switch (location.pathname) {
      case "/":
      case "/overview": return "Overview";
      case "/transactions": return "Transactions";
      case "/analytics": return "Analytics";
      case "/budgets": return "Budgets";
      case "/invoices": return "Invoices";
      case "/monthly-summary": return "Monthly Summary";
      case "/settings": return "Settings";
      default: return "Overview";
    }
  }, [location.pathname]);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [insights, setInsights] = useState(initialInsights);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState("1W");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const telegramToken = "tg_auth_9x8f2p";

  // New state slices for dashboard enhancements
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile);
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending>({
    month: "2026-04",
    total: 2842.50,
    weeks: mockWeeklySpending,
    expanded: false,
  });
  const [deepLedgerVisible, setDeepLedgerVisible] = useState(false);
  const [liabilities, setLiabilities] = useState<Liabilities>(mockLiabilities);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>(mockMonthlySummary);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

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
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`flex items-center gap-2 px-2 pb-6 transition-all duration-200 hover:opacity-70 active:scale-95 ${sidebarCollapsed ? "justify-center" : ""}`}
          >
            <img src="/logo.svg" alt="Finehance" className="h-7 w-7" />
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="leading-tight"
              >
                <img src="/logo-text.svg" alt="Finehance" className="h-4" />
                <div className="text-[10px] text-slate-400">Personal · Pro</div>
              </motion.div>
            )}
          </button>

          <nav className="flex flex-col gap-0.5 text-[13px]">
            <NavItem icon={<LayoutDashboard size={14} />} label="Overview" to="/" collapsed={sidebarCollapsed} />
            <NavItem icon={<ArrowLeftRight size={14} />} label="Transactions" to="/transactions" badge="142" collapsed={sidebarCollapsed} />
            <NavItem icon={<PieChart size={14} />} label="Analytics" to="/analytics" collapsed={sidebarCollapsed} />
            <NavItem icon={<Target size={14} />} label="Budgets" to="/budgets" collapsed={sidebarCollapsed} />
            <NavItem icon={<Briefcase size={14} />} label="Invoices" to="/invoices" badge="2" collapsed={sidebarCollapsed} />
            <div className="my-3 h-px bg-slate-200/70" />
            <NavItem icon={<Sparkles size={14} />} label="Monthly Summary" to="/monthly-summary" collapsed={sidebarCollapsed} />
            <NavItem icon={<Settings size={14} />} label="Settings" to="/settings" collapsed={sidebarCollapsed} />
          </nav>


        </motion.aside>

        {/* ─── Main column ─── */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/70 bg-[#FAFAF9]/85 px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span className="text-slate-400">Workspace</span>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="font-medium text-slate-900">{pageTitle}</span>
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
              <button 
                onClick={() => setProfileModalOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold transition hover:border-slate-300 hover:shadow-sm"
              >
                JD
              </button>
            </div>
          </header>

          <main className="px-6 pb-24 py-6">
            {(location.pathname === "/" || location.pathname === "/overview") ? (
              <>
            {/* KPI strip */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat title="Total Balance" value="$16,618.00" trend="+12.5%" up data={sparkA} accent="#0F172A" />
              <MonthlySpentCard
                value="$2,842.50"
                trend="-2.4%"
                data={sparkB}
                spending={monthlySpending}
                onToggle={() =>
                  setMonthlySpending((prev) => ({
                    ...prev,
                    expanded: !prev.expanded,
                  }))
                }
                onViewFullHistory={() => setDeepLedgerVisible(true)}
              />
              <Stat title="Revenue MTD" value="$8,500.00" trend="+18.2%" up data={sparkC} accent="#059669" />
              <PendingInvoicesCard
                liabilities={liabilities}
                onToggle={() => setLiabilities((prev) => ({ ...prev, expanded: !prev.expanded }))}
                onMarkPaid={(id) => {
                  setLiabilities((prev) => ({
                    ...prev,
                    fixed: prev.fixed.filter((l) => l.id !== id),
                    variable: prev.variable.filter((l) => l.id !== id),
                  }));
                }}
                fmt={fmt}
              />
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
                {/* Vivien AI */}
                <Panel>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                        <Sparkles size={13} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">Vivien Insights</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Personalized recommendations</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      Online
                    </span>
                  </div>

                  <p className="mb-4 text-[12px] leading-relaxed text-slate-500">
                    Proactive strategies to optimize your cash flow and reduce unnecessary expenditures this month.
                  </p>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-200/60 bg-indigo-50/30 p-3 transition hover:border-indigo-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[11px] font-semibold text-slate-900">Spending Forecast</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">Your projected spend is on track to be 12% lower than last month.</p>
                      <button className="flex items-center gap-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-700">
                        View details <ArrowRight size={10} />
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-200/60 bg-amber-50/30 p-3 transition hover:border-amber-200">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="text-[11px] font-semibold text-slate-900">Savings Opportunity</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">We identified $145 in redundant SaaS subscriptions.</p>
                      <button className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 hover:text-amber-700">
                        Review subscriptions <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                </Panel>

                {/* Monthly Summary */}
                <Panel>
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        <Sparkles size={12} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">Monthly Summary</div>
                        <div className="text-[10px] text-slate-400">April 2026</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Net Cashflow */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Net Cashflow</div>
                      <div className={`mt-1 text-lg font-semibold tabular-nums ${monthlySummary.netCashflow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmt(monthlySummary.netCashflow)}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Cash flow is{" "}
                        <span className={`font-semibold ${monthlySummary.comparisonToPreviousMonth.cashflowChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {Math.abs(monthlySummary.comparisonToPreviousMonth.cashflowChange)}%{" "}
                          {monthlySummary.comparisonToPreviousMonth.cashflowChange >= 0 ? "higher" : "lower"}
                        </span>{" "}
                        than March
                      </div>
                    </div>

                    {/* Spending Breakdown */}
                    <div>
                      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Top Categories</div>
                      <div className="space-y-1.5">
                        {Object.entries(monthlySummary.categoryBreakdown)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 4)
                          .map(([category, amount]) => (
                            <div key={category} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600">{category}</span>
                              <span className="font-semibold tabular-nums text-slate-900">{fmt(amount)}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Anomalies */}
                    {monthlySummary.anomalies.length > 0 && (
                      <div>
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">Anomalies</div>
                        <div className="space-y-2">
                          {monthlySummary.anomalies.map((anomaly, i) => (
                            <div
                              key={i}
                              className={`rounded-lg border px-3 py-2 text-[11px] ${
                                anomaly.severity === "high"
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : anomaly.severity === "medium"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  anomaly.severity === "high" ? "bg-rose-500" : anomaly.severity === "medium" ? "bg-amber-500" : "bg-slate-400"
                                }`} />
                                <span className="font-semibold">{anomaly.category}</span>
                                <span className="text-[10px] opacity-70">+{anomaly.percentageChange}%</span>
                              </div>
                              <p className="mt-0.5 leading-relaxed opacity-80">{anomaly.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
            </>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      {/* Floating Chat Bar */}
      <TelegramChatBar />

      {/* Deep Ledger Modal */}
      <AnimatePresence>
        {deepLedgerVisible && (
          <DeepLedger
            transactions={mockDeepLedgerTransactions}
            onClose={() => setDeepLedgerVisible(false)}
          />
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
            >
              <UserProfileSuite 
                profile={userProfile} 
                onEditProfile={() => {
                  setProfileModalOpen(false);
                  console.log("Edit profile clicked");
                }} 
              />
              <button
                onClick={() => setProfileModalOpen(false)}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────
function NavItem({ icon, label, badge, collapsed, to }: { icon: React.ReactNode, label: string, badge?: string, collapsed?: boolean, to?: string }) {
  const destination = to || "#";
  return (
    <NavLink
      to={destination}
      className={({ isActive }) => `flex items-center rounded-md px-2.5 py-1.5 transition-colors ${
        collapsed ? "justify-center" : "justify-between"
      } ${
        isActive 
          ? "bg-slate-900 text-white" 
          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
      }`}
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className={`flex items-center gap-2.5 ${collapsed ? "" : ""}`}>
            <span className={isActive ? "text-white" : "text-slate-400"}>
              {icon}
            </span>
            {!collapsed && <span className="text-[12px] font-medium tracking-wide">{label}</span>}
          </span>
          {badge && !collapsed && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function Panel({ children, className = "", padding = "p-5" }: { children: React.ReactNode, className?: string, padding?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] ${padding === "0" ? "" : padding} ${className}`}
    >
      {children}
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{title}</span>
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${muted ? "bg-amber-50 text-amber-700" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          {!muted && (up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />)}
          {trend}
        </motion.span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-[22px] font-semibold tracking-tight tabular-nums text-slate-900"
        >
          {value}
        </motion.div>
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
    </motion.div>
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
