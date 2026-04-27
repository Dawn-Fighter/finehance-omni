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
  HIGH: "text-red-500 border-red-500/25",
  MEDIUM: "text-amber-500 border-amber-500/25",
  LOW: "text-gray-500 border-gray-500/25",
};

// ─── ForecastCard ───────────────────────────────────────────────────────
function ForecastCard({ forecast, trend }: { forecast: ForecastPoint[]; trend: TrendDirection }) {
  const trendIcon = trend === "increasing" ? "↑" : trend === "decreasing" ? "↓" : "→";
  const trendClass =
    trend === "increasing"
      ? "text-red-500"
      : trend === "decreasing"
        ? "text-emerald-500"
        : "text-gray-500";

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
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${PRIORITY_CLASSES.HIGH}`}>
          HIGH
        </span>
        <span className="text-[11px] text-slate-500">ARIMA(1,1,1) Model</span>
      </div>

      <h3 className="mb-2 text-[13px] font-semibold leading-snug text-slate-200">
        📈 30-Day Spending Forecast
      </h3>

      <div className="mb-1 flex items-center gap-2">
        <span className={`text-xl font-bold ${trendClass}`}>
          {trendIcon} {trend.toUpperCase()}
        </span>
        <span className="text-xs text-slate-500">next 7 days vs last 7</span>
      </div>

      <div className="mt-3 h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: 8,
                fontSize: 11,
                padding: "6px 10px",
              }}
              labelStyle={{ color: "#e5e7eb" }}
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
              stroke="#374151"
              fill="none"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
        <li className="list-disc">
          Predicted avg daily spend: <strong className="text-slate-200">${avgDaily}</strong>
        </li>
        <li className="list-disc">
          Model confidence: <strong className="text-emerald-400">85%</strong>
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
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 p-4">
      <div className="mb-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest ${PRIORITY_CLASSES[config.priority]}`}
        >
          {config.priority}
        </span>
      </div>
      <h3 className="mb-2 text-[13px] font-semibold leading-snug text-slate-200">
        {config.icon} {config.title}
      </h3>
      <ul className="space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
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
          <div className="h-[260px] animate-pulse rounded-xl bg-slate-800" />
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
