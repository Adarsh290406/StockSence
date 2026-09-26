// src/views/WarehouseView.jsx
import React, { useState, useEffect } from 'react';
import { Check, Plus, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function WarehouseView() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State strictly matching Excalidraw Warehouse Screen
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [address, setAddress] = useState('');

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.getWarehouses();
      if (res.success) {
        setWarehouses(res.data);
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.createWarehouse({
        name,
        short_code: shortCode.trim().toUpperCase(),
        address
      });
      if (res.success) {
        setSuccessMsg(`Warehouse ${name} (${shortCode}) created in PostgreSQL!`);
        setName('');
        setShortCode('');
        setAddress('');
        await fetchWarehouses();
      }
    } catch (err) {
      alert(err.message || 'Failed to create warehouse');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-8">
        {/* Title strictly matching Excalidraw */}
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Warehouse</h1>
          <p className="text-xs text-slate-400 mt-1 italic">
            This page contains the warehouse details & location.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center space-x-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Excalidraw Exact Form Layout: Name, Short Code, Address */}
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Name:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Central Warehouse Hub"
              className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-medium bg-slate-50/50 rounded-t-lg transition-colors"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Short Code:</label>
            <input
              type="text"
              required
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value.toUpperCase())}
              placeholder="e.g. WH"
              className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-mono font-bold bg-slate-50/50 rounded-t-lg transition-colors uppercase"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 Industrial Parkway, Central Hub"
              className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-medium bg-slate-50/50 rounded-t-lg transition-colors"
            />
          </div>

          <div className="flex justify-start pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Warehouse in PostgreSQL'}
            </button>
          </div>
        </form>

        {/* Existing Warehouses List */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              Configured Warehouses ({warehouses.length})
            </h3>
            <button
              onClick={fetchWarehouses}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map(w => (
              <div key={w.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{w.name}</span>
                  <span className="font-mono text-xs font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {w.short_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{w.address || 'No physical address specified'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
