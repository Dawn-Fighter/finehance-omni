import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useARIMAForecast, type ForecastPoint, type TrendDirection } from "../hooks/useARIMAForecast";

// ─── Config ─────────────────────────────────────────────────────────────
const INSIGHT_CONFIGS = [
  { id: "forecast", priority: "HIGH" as const, icon: "📈", title: "ARIMA Spending Forecast", color: "#6366f1" },
  { id: "savings", priority: "MEDIUM" as const, icon: "💡", title: "Savings Opportunity", color: "#f59e0b" },
  { id: "emergency", priority: "LOW" as const, icon: "🛡️", title: "Build Emergency Fund", color: "#10b981" },
  { id: "budget", priority: "LOW" as const, icon: "📊", title: "Create Monthly Budget", color: "#8b5cf6" },
];

type Priority = "HIGH" | "MEDIUM" | "LOW";

const PRIORITY_CLASSES: Record<Priority, string> = {
  HIGH: "text-red-600 border-red-200 bg-red-50",
  MEDIUM: "text-amber-600 border-amber-200 bg-amber-50",
  LOW: "text-slate-500 border-slate-200 bg-slate-50",
};

// ─── ForecastCard ───────────────────────────────────────────────────────
function ForecastCard({ forecast, trend }: { forecast: ForecastPoint[]; trend: TrendDirection }) {
  const trendIcon = trend === "increasing" ? "↑" : trend === "decreasing" ? "↓" : "→";
  const trendClass =
    trend === "increasing"
      ? "text-red-600"
      : trend === "decreasing"
        ? "text-emerald-600"
        : "text-slate-500";

  const chartData = forecast.slice(0, 14).map((d) => ({
    name: `D+${d.day}`,
    predicted: d.predicted,
    upper: d.upper,
    lower: d.lower,
  }));

  const avgDaily =
    forecast.length > 0
      ? (forecast.slice(0, 7).reduce((a, b) => a + b.predicted, 0) / 7).toFixed(2)
      : "0.00";

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${PRIORITY_CLASSES.HIGH}`}>
          HIGH
        </span>
        <span className="text-[11px] text-slate-400">ARIMA(1,1,1) Model</span>
      </div>

      <h3 className="mb-2 text-[13px] font-semibold leading-snug text-slate-900">
        📈 30-Day Spending Forecast
      </h3>

      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xl font-bold ${trendClass}`}>
          {trendIcon} {trend.toUpperCase()}
        </span>
        <span className="text-xs text-slate-400">next 7 days vs last 7</span>
      </div>

      <div className="mt-3 h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 11,
                padding: "6px 10px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
              }}
              labelStyle={{ color: "#334155" }}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#6366f1"
              fill="url(#forecastGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="#cbd5e1"
              fill="none"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 space-y-1 pl-4 text-xs leading-relaxed text-slate-500">
        <li className="list-disc">
          Predicted avg daily spend: <strong className="text-slate-900">${avgDaily}</strong>
        </li>
        <li className="list-disc">
          Model confidence: <strong className="text-emerald-600">85%</strong>
        </li>
        <li className="list-disc">Based on last 90 days of transactions</li>
      </ul>
    </div>
  );
}

// ─── InsightCard ────────────────────────────────────────────────────────
function InsightCard({
  config,
  content,
}: {
  config: (typeof INSIGHT_CONFIGS)[number];
  content: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="mb-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${PRIORITY_CLASSES[config.priority]}`}
        >
          {config.priority}
        </span>
      </div>
      <h3 className="mb-2 text-[13px] font-semibold leading-snug text-slate-900">
        {config.icon} {config.title}
      </h3>
      <ul className="space-y-1 pl-4 text-xs leading-relaxed text-slate-500">
        {content.map((item, i) => (
          <li key={i} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────
export default function InsightsPanel() {
  const { forecast, trend, loading } = useARIMAForecast();

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="text-sm font-bold tracking-wide text-indigo-500">✦ Vivien</span>
        <span className="text-[13px] text-slate-500">
          Insights — Personalized recommendations
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <div className="h-[260px] animate-pulse rounded-xl border border-slate-200/80 bg-slate-50" />
        ) : (
          <ForecastCard forecast={forecast} trend={trend} />
        )}

        <InsightCard
          config={INSIGHT_CONFIGS[1]}
          content={[
            "Review Other Expenses transactions for unnecessary costs",
            "Look for cheaper alternatives in subscriptions",
            "Set a lower budget for next period",
          ]}
        />

        <InsightCard
          config={INSIGHT_CONFIGS[2]}
          content={[
            "Calculate your monthly expenses baseline",
            "Set up automatic transfers to savings",
            "Aim for 3-6 months of expenses as buffer",
          ]}
        />

        <InsightCard
          config={INSIGHT_CONFIGS[3]}
          content={[
            "Review spending patterns by category",
            "Set budget limits for major expense categories",
            "Track weekly to stay on target",
          ]}
        />
      </div>
    </div>
  );
}
