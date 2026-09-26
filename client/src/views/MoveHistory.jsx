// src/views/MoveHistory.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, List, LayoutGrid, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function MoveHistory({ onNavigateToOperations }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.getLedger({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setLedger(res.data);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const filteredMoves = ledger.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.reference_no?.toLowerCase().includes(s) ||
      item.product_name?.toLowerCase().includes(s) ||
      item.user_name?.toLowerCase().includes(s) ||
      item.from_location_name?.toLowerCase().includes(s) ||
      item.to_location_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header Bar strictly matching Excalidraw */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: NEW Button + Title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigateToOperations && onNavigateToOperations('ALL')}
            className="flex items-center space-x-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NEW</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Move History
          </h1>
        </div>

        {/* Right Side: Search Box + List/Kanban toggles */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or contact..."
              className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-60 shadow-xs"
            />
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'kanban' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading PostgreSQL move history...</span>
          </div>
        ) : filteredMoves.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No stock movements recorded in PostgreSQL yet.
          </div>
        ) : viewMode === 'list' ? (
          /* List View matching Excalidraw Columns: Reference | Date | Contact | From | To | Quantity | Status */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">From</th>
                  <th className="p-4">To</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredMoves.map(m => {
                  const isIn = m.movement_type === 'receipt' || (m.to_location_name && !m.from_location_name);
                  const formattedDate = m.created_at ? new Date(m.created_at).toLocaleDateString('en-US') : '12/1/2001';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Reference Column: Green for In, Red for Out as specified in Excalidraw */}
                      <td className="p-4 font-mono font-bold text-xs">
                        <span className={`px-2 py-1 rounded-md border font-semibold ${
                          isIn 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {m.reference_no}
                        </span>
                      </td>

                      {/* Date Column */}
                      <td className="p-4 text-slate-600 text-xs font-mono">
                        {formattedDate}
                      </td>

                      {/* Contact Column */}
                      <td className="p-4 text-slate-800 font-semibold text-xs">
                        {m.user_name || 'Azure Interior'}
                      </td>

                      {/* From Column */}
                      <td className="p-4 text-slate-600 font-medium text-xs">
                        {m.from_location_name || 'vendor'}
                      </td>

                      {/* To Column */}
                      <td className="p-4 text-slate-600 font-medium text-xs">
                        {m.to_location_name || 'WH/Stock1'}
                      </td>

                      {/* Quantity Column */}
                      <td className="p-4 font-extrabold text-slate-900 text-xs">
                        <span className={isIn ? 'text-emerald-700' : 'text-rose-700'}>
                          {isIn ? `+${m.quantity}` : `-${m.quantity}`} {m.product_uom}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-normal">{m.product_name}</span>
                      </td>

                      {/* Status Column */}
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Ready
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Kanban View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50">
            {['receipt', 'delivery', 'internal_transfer'].map(typeKey => {
              const items = filteredMoves.filter(m => m.movement_type === typeKey);
              return (
                <div key={typeKey} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      {typeKey.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 flex-1">
                    {items.map(m => (
                      <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900">{m.reference_no}</span>
                          <span className="font-bold text-slate-700">{m.quantity} {m.product_uom}</span>
                        </div>
                        <p className="text-slate-800 font-semibold">{m.product_name}</p>
                        <p className="text-slate-400 text-[11px]">{m.from_location_name || 'Vendor'} → {m.to_location_name || 'WH'}</p>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">No logs</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Populate all moves done between the from - To location in inventory. In events are displayed in green, Out moves in red.
      </p>
    </div>
  );
}