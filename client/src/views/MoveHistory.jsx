// src/views/MoveHistory.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { History, ArrowRight } from 'lucide-react';

export default function MoveHistory() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      const res = await api.getLedger({ limit: 100 });
      if (res.success) {
        setLedger(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Move History & Audit Trail</h1>
          <p className="text-sm text-slate-500">Immutable chronological log of all stock movements recorded in PostgreSQL.</p>
        </div>
        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
          Total Logs: {ledger.length}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading audit ledger...</div>
        ) : ledger.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No movements recorded in the audit trail yet. Validate an operation to generate records!
          </div>
        ) : (
          ledger.map(item => (
            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${
                  item.movement_type === 'receipt' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  item.movement_type === 'delivery' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  LOG
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-900">{item.reference_no}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-blue-600 capitalize">{item.movement_type.replace('_', ' ')}</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5">
                    {item.product_name} ({item.product_sku}) — <span className="font-extrabold text-blue-700">{item.quantity} {item.product_uom}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.from_location_name || 'Vendor'} → {item.to_location_name || 'Customer'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-slate-700 block">{item.user_name || 'System User'}</span>
                <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}