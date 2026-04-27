import React from "react";
import { Briefcase, AlertCircle, CheckCircle2 } from "lucide-react";

export function Invoices() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoices & Liabilities</h1>
          <p className="mt-1 text-sm text-slate-500">Track pending payments and fixed expenses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Pending Invoices</h3>
            <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">2 Due</span>
          </div>
          <div className="space-y-3">
            {[
              { id: 1, name: "AWS Services", amount: "$1,240.20", date: "Due Apr 30", overdue: false },
              { id: 2, name: "Stripe Processing", amount: "$299.00", date: "Due May 1", overdue: false }
            ].map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                    <Briefcase size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{inv.name}</div>
                    <div className="text-xs text-slate-500">{inv.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{inv.amount}</div>
                  <button className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">Pay Now</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Paid Recently</h3>
            <span className="text-xs text-slate-500">Last 30 days</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-100 rounded-lg text-slate-400">
              <span className="text-sm flex items-center gap-2"><CheckCircle2 size={16}/> No recent payments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
