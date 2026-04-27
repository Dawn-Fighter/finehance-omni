import React from "react";
import { PieChart, TrendingUp, BarChart3 } from "lucide-react";

export function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Deep dive into your financial performance.</p>
        </div>
        <select className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none">
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900">Cash Flow Trend</h3>
          <p className="mb-4 text-xs text-slate-500">Income vs Expenses over time</p>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
            <div className="flex flex-col items-center text-slate-400">
              <TrendingUp size={32} className="mb-2" />
              <p className="text-sm">Detailed Chart UI goes here</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Top Categories</h3>
            <div className="mt-4 space-y-4">
              {['Infrastructure', 'Software', 'Dining'].map((cat, i) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{cat}</span>
                    <span className="font-medium text-slate-900">{75 - i * 15}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-indigo-500" style={{ width: `${75 - i * 15}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Insights</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Your software spending has increased by 14% compared to last month. Consider reviewing unused subscriptions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
