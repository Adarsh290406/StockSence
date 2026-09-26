// src/views/Settings.jsx
import React from 'react';

export default function Settings() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System & Terminal Settings</h1>
        <p className="text-sm text-slate-500">Configure terminal parameters, cycle windows, and automated sync rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Terminal WH-01 Parameters</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Terminal Name</label>
              <input type="text" defaultValue="Main Terminal WH-01" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Standard Cycle Window</label>
              <input type="text" defaultValue="08:00 - 18:00" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-slate-700">Auto-Sync IoT Sensors</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Notifications & Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Late Task Email Alerts</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Critical Stock Threshold Warnings</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Shift Change Audio Chime</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}