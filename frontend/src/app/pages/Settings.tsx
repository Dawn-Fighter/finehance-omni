import React from "react";
import { Settings as SettingsIcon, User, Bell, Shield, Wallet } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your account preferences and integrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="col-span-1 space-y-1">
          <button className="flex w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900">
            <User size={16} /> Profile
          </button>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <Wallet size={16} /> Accounts
          </button>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <Bell size={16} /> Notifications
          </button>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <Shield size={16} /> Security
          </button>
        </div>

        <div className="col-span-3">
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-base font-semibold text-slate-900">Profile Information</h3>
              <p className="text-sm text-slate-500">Update your personal details and system identifier.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Display Name</label>
                  <input type="text" defaultValue="Jordan" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">System Identifier</label>
                  <input type="text" defaultValue="@kashy_fin" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 focus:border-indigo-500 focus:outline-none" readOnly />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
                <input type="email" defaultValue="jordan@example.com" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
