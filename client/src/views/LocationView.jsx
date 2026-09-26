// src/views/LocationView.jsx
import React, { useState, useEffect } from 'react';
import { Check, Plus, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function LocationView() {
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State strictly matching Excalidraw Location Screen: Name, Short Code, warehouse
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, locRes] = await Promise.all([
        api.getWarehouses(),
        api.getLocations()
      ]);
      if (whRes.success) {
        setWarehouses(whRes.data);
        if (whRes.data.length > 0 && !warehouseId) {
          setWarehouseId(whRes.data[0].id);
        }
      }
      if (locRes.success) {
        setLocations(locRes.data);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.createLocation({
        name,
        short_code: shortCode.trim().toUpperCase(),
        warehouse_id: warehouseId ? Number(warehouseId) : null,
        location_type: 'internal'
      });
      if (res.success) {
        setSuccessMsg(`Location ${name} (${shortCode}) created in PostgreSQL!`);
        setName('');
        setShortCode('');
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-8">
        {/* Title strictly matching Excalidraw */}
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">location</h1>
          <p className="text-xs text-slate-400 mt-1 italic">
            This holds the multiple locations of warehouse, rooms etc.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center space-x-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Excalidraw Exact Form Layout: Name, Short Code, warehouse */}
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Name:</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WH/Stock1"
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
              placeholder="e.g. WH-STK-01"
              className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-mono font-bold bg-slate-50/50 rounded-t-lg transition-colors uppercase"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-bold text-slate-800 w-32 shrink-0">warehouse:</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-bold bg-slate-50/50 rounded-t-lg transition-colors"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.short_code} ({w.name})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-start pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Location in PostgreSQL'}
            </button>
          </div>
        </form>

        {/* Existing Locations List */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              Configured Locations ({locations.length})
            </h3>
            <button
              onClick={fetchData}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map(l => (
              <div key={l.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{l.name}</span>
                  <span className="font-mono text-xs font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    {l.short_code}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {l.warehouse_name || 'Main Warehouse'} • Type: <span className="capitalize">{l.location_type}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
