// src/views/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Truck, ArrowRight, Clock, Boxes, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ onNavigateToOperations }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchKpis = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getDashboardKpis();
      if (res.success) {
        setKpis(res.data);
        setError(null);
      }
    } catch (err) {
      setError('Could not connect to live backend database');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    const interval = setInterval(() => fetchKpis(), 5000);
    return () => clearInterval(interval);
  }, []);

  const receipts = kpis?.receipts || { total_receipts: 0, pending_receipts: 0, late_receipts: 0, ready_receipts: 0 };
  const deliveries = kpis?.deliveries || { total_deliveries: 0, pending_deliveries: 0, late_deliveries: 0, ready_deliveries: 0, waiting_deliveries: 0 };
  const inventory = kpis?.inventory || { total_units_on_hand: 0, total_units_reserved: 0, total_stock_valuation: 0 };
  const alerts = kpis?.alerts || { low_stock_items: 0 };
  const recentMoves = kpis?.recent_activity || [];

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
          <button
            onClick={() => fetchKpis(true)}
            className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Auto-sync active'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{error}. Make sure your PostgreSQL server is running on port 5000.</span>
        </div>
      )}

      {/* Main Operational Cards Grid matching Excalidraw exactly */}
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
                WH/IN
              </div>
            </div>

            {/* Immediate Task Box */}
            <div
              onClick={() => onNavigateToOperations && onNavigateToOperations('receipt')}
              className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 mb-6 flex items-center justify-between cursor-pointer hover:bg-blue-50/40 hover:border-blue-200 transition-all group"
            >
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">IMMEDIATE TASK</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {receipts.pending_receipts} to receive
                </h3>
              </div>
              <div className="w-11 h-11 bg-slate-900 group-hover:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs transition-colors">
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Sub-status badges matching Excalidraw */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-900">{receipts.late_receipts} Late</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{receipts.total_receipts} operations <span className="text-slate-400 font-normal">(total)</span></span>
            </div>
          </div>
        </div>

        {/* Delivery Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Delivery</h2>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">OUTBOUND DISPATCH ENGINE</p>
                </div>
              </div>
              <div className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider">
                WH/OUT
              </div>
            </div>

            {/* Immediate Task Box */}
            <div
              onClick={() => onNavigateToOperations && onNavigateToOperations('delivery')}
              className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-5 mb-6 flex items-center justify-between cursor-pointer hover:bg-purple-50/40 hover:border-purple-200 transition-all group"
            >
              <div>
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">IMMEDIATE TASK</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
                  {deliveries.pending_deliveries} to Deliver
                </h3>
              </div>
              <div className="w-11 h-11 bg-slate-900 group-hover:bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-xs transition-colors">
                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Sub-status badges matching Excalidraw */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs font-bold text-amber-900">{deliveries.late_deliveries} Late</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>{deliveries.waiting_deliveries} waiting</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{deliveries.total_deliveries} operations <span className="text-slate-400 font-normal">(total)</span></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}