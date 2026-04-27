import React from "react";
import { Target, Plus } from "lucide-react";

export function Budgets() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Budgets</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your spending limits and goals.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
          <Plus size={16} /> New Budget
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[{ name: "Software", spent: 315, total: 500, color: "bg-indigo-500" },
          { name: "Dining", spent: 247, total: 300, color: "bg-amber-500" },
          { name: "Infrastructure", spent: 1240, total: 1000, color: "bg-rose-500", over: true }
        ].map((b) => (
          <div key={b.name} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{b.name}</h3>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${b.over ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                {b.over ? "Over Budget" : "On Track"}
              </span>
            </div>
            <div className="mb-2 flex justify-between text-2xl font-bold tracking-tight">
              <span className={b.over ? "text-rose-600" : "text-slate-900"}>${b.spent}</span>
              <span className="text-slate-400 text-lg font-medium self-end">/ ${b.total}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${b.color}`} style={{ width: `${Math.min((b.spent / b.total) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
