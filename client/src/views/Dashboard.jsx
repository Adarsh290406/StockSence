// src/views/Dashboard.jsx
import React from 'react';
import { RefreshCw, Download, Truck, ArrowRight, Clock } from 'lucide-react';

export default function Dashboard({ onNavigateToOperations }) {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb & Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-slate-500 font-medium">Logistics Dispatch & Inbound</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">Daily Operations Control</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Cycle Time pill */}
          <div className="flex items-center space-x-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-bold tracking-wider uppercase text-slate-700">CYCLE 08:00 - 18:00</span>
          </div>

          {/* Auto-sync status */}
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="hidden sm:inline">Auto-sync active</span>
          </div>
        </div>
      </div>

      {/* Main Operational Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Receipt Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Receipt</h2>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">INBOUND STOCK CONTROL</p>
                </div>
              </div>
              <div className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider">
                SEC-IN-01
              </div>
            </div>

            {/* Immediate Task Box */}
            <div 
              onClick={onNavigateToOperations}
              className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 mb-6 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 hover:border-blue-200 transition-all group"
            >
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">IMMEDIATE TASK</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">4 to receive</h3>
              </div>
              <div className="w-11 h-11 bg-slate-900 group-hover:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs transition-colors">
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Sub-status badges */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-900">1 Late</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>6 Operations <span className="text-slate-400 font-normal">(scheduled after today)</span></span>
            </div>
          </div>
        </div>

        {/* Delivery Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Delivery</h2>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">OUTBOUND DISPATCH ENGINE</p>
                </div>
              </div>
              <div className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider">
                BAY-OUT-04
              </div>
            </div>

            {/* Immediate Task Box */}
            <div 
              onClick={onNavigateToOperations}
              className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 mb-6 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 hover:border-blue-200 transition-all group"
            >
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">IMMEDIATE TASK</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">4 to Deliver</h3>
              </div>
              <div className="w-11 h-11 bg-slate-900 group-hover:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs transition-colors">
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Sub-status badges */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-900">1 Late</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>2 Waiting</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>6 Operations <span className="text-slate-400 font-normal">(scheduled after today)</span></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}