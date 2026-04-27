import React from "react";
import { ArrowLeftRight, Search, Filter, Download } from "lucide-react";

export function Transactions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage your entire transaction history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">
            <Filter size={16} /> Filter
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by merchant, category, or amount..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Mock Rows */}
            <tr className="transition-colors hover:bg-slate-50/50">
              <td className="px-6 py-4 text-slate-500">Apr 27, 2026</td>
              <td className="px-6 py-4 font-medium text-slate-900">AWS Services</td>
              <td className="px-6 py-4 text-slate-500">Infrastructure</td>
              <td className="px-6 py-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Completed</span></td>
              <td className="px-6 py-4 text-right font-medium text-slate-900">-$1,240.20</td>
            </tr>
            <tr className="transition-colors hover:bg-slate-50/50">
              <td className="px-6 py-4 text-slate-500">Apr 26, 2026</td>
              <td className="px-6 py-4 font-medium text-slate-900">Acme Corp</td>
              <td className="px-6 py-4 text-slate-500">Income</td>
              <td className="px-6 py-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Completed</span></td>
              <td className="px-6 py-4 text-right font-medium text-emerald-600">+$4,500.00</td>
            </tr>
            <tr className="transition-colors hover:bg-slate-50/50">
              <td className="px-6 py-4 text-slate-500">Apr 25, 2026</td>
              <td className="px-6 py-4 font-medium text-slate-900">Stripe</td>
              <td className="px-6 py-4 text-slate-500">Software</td>
              <td className="px-6 py-4"><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Processing</span></td>
              <td className="px-6 py-4 text-right font-medium text-slate-900">-$299.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
