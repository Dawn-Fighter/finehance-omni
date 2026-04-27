import React from "react";
import { Bot, Sparkles } from "lucide-react";

export function MonthlySummary() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI Monthly Summary</h1>
            <p className="mt-1 text-sm text-slate-500">Vivien's comprehensive review for April 2026.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">
          Previous Month
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles size={16} className="text-indigo-500"/> Vivien's Executive Summary
          </h3>
          <div className="prose prose-sm prose-slate max-w-none text-slate-600">
            <p>Overall, cash flow is looking extremely healthy this month. You have achieved a positive net cashflow of <strong>$5,657.50</strong>, driven by a large client payment from Acme Corp.</p>
            <p>However, we noticed a sharp 40% increase in Infrastructure spending (AWS). This appears to be related to the new RDS instances spun up on the 14th.</p>
            <p><strong>Recommendation:</strong> Consider purchasing Reserved Instances if this database capacity is meant for long-term production use.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-6 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-rose-900">Identified Anomalies</h3>
            <ul className="space-y-2 text-sm text-rose-800">
              <li className="flex gap-2">
                <span className="font-bold shrink-0">•</span> 
                <span>AWS Bill spiked by 40% ($350 increase).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">•</span> 
                <span>Uncategorized "Stripe" charge occurred twice this week.</span>
              </li>
            </ul>
          </div>
          
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-6 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-emerald-900">Positive Trends</h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li className="flex gap-2">
                <span className="font-bold shrink-0">•</span> 
                <span>Dining expenses have dropped by 12% week-over-week.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">•</span> 
                <span>Savings target reached 4 days earlier than expected.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
