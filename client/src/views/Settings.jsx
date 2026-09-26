// src/views/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Warehouse as WarehouseIcon, MapPin, Plus, Check, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Settings({ initialSubView = 'location' }) {
  const [activeSubView, setActiveSubView] = useState(initialSubView); // 'warehouse' | 'location'
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Warehouse Form State matching Excalidraw Warehouse Screen
  const [whForm, setWhForm] = useState({
    name: '',
    short_code: '',
    address: ''
  });

  // Location Form State matching Excalidraw Location Screen
  const [locForm, setLocForm] = useState({
    name: '',
    short_code: '',
    warehouse_id: '',
    location_type: 'internal'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, locRes] = await Promise.all([
        api.getWarehouses(),
        api.getLocations()
      ]);
      if (whRes.success) {
        setWarehouses(whRes.data);
        if (whRes.data.length > 0 && !locForm.warehouse_id) {
          setLocForm(prev => ({ ...prev, warehouse_id: whRes.data[0].id }));
        }
      }
      if (locRes.success) setLocations(locRes.data);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.createWarehouse(whForm);
      if (res.success) {
        setSuccessMsg(`Warehouse ${whForm.name} (${whForm.short_code}) saved successfully!`);
        setWhForm({ name: '', short_code: '', address: '' });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.createLocation({
        name: locForm.name,
        short_code: locForm.short_code,
        warehouse_id: locForm.warehouse_id ? Number(locForm.warehouse_id) : null,
        location_type: locForm.location_type || 'internal'
      });
      if (res.success) {
        setSuccessMsg(`Location ${locForm.name} (${locForm.short_code}) saved successfully!`);
        setLocForm(prev => ({ ...prev, name: '', short_code: '' }));
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Sub-navigation tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveSubView('location')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeSubView === 'location'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Location
          </button>
          <button
            onClick={() => setActiveSubView('warehouse')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeSubView === 'warehouse'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Warehouse
          </button>
        </div>

        <p className="text-xs text-slate-400 italic hidden sm:inline">
          {activeSubView === 'location'
            ? 'This holds the multiple location records inside your warehouses.'
            : 'This page contains the warehouse details & location configuration.'}
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Excalidraw Form Screen */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6">
          {activeSubView === 'location' ? (
            /* Location Form matching Excalidraw exact fields: Name, Short Code, Warehouse */
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">location</h2>
              <form onSubmit={handleSaveLocation} className="space-y-6 max-w-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Name:</label>
                  <input
                    type="text"
                    required
                    value={locForm.name}
                    onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                    placeholder="e.g. WH/Stock1"
                    className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-medium bg-slate-50/50 rounded-t-lg transition-colors"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Short Code:</label>
                  <input
                    type="text"
                    required
                    value={locForm.short_code}
                    onChange={(e) => setLocForm({ ...locForm, short_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH-STK-01"
                    className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-mono font-bold bg-slate-50/50 rounded-t-lg transition-colors uppercase"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Warehouse:</label>
                  <select
                    value={locForm.warehouse_id}
                    onChange={(e) => setLocForm({ ...locForm, warehouse_id: e.target.value })}
                    className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-bold bg-slate-50/50 rounded-t-lg transition-colors"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.short_code} ({w.name})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Location in PostgreSQL'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Warehouse Form matching Excalidraw exact fields: Name, Short Code, Address */
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Warehouse</h2>
              <form onSubmit={handleSaveWarehouse} className="space-y-6 max-w-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Name:</label>
                  <input
                    type="text"
                    required
                    value={whForm.name}
                    onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                    placeholder="e.g. Main Warehouse"
                    className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-medium bg-slate-50/50 rounded-t-lg transition-colors"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Short Code:</label>
                  <input
                    type="text"
                    required
                    value={whForm.short_code}
                    onChange={(e) => setWhForm({ ...whForm, short_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH"
                    className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-mono font-bold bg-slate-50/50 rounded-t-lg transition-colors uppercase"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="text-sm font-bold text-slate-800 w-32 shrink-0">Address:</label>
                  <input
                    type="text"
                    value={whForm.address}
                    onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
                    placeholder="e.g. 100 Industrial Parkway, Central Hub"
                    className="flex-1 px-3 py-2 border-b-2 border-slate-300 focus:border-blue-600 outline-none text-sm font-medium bg-slate-50/50 rounded-t-lg transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Warehouse in PostgreSQL'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Active Records List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
              {activeSubView === 'location' ? `Existing Locations (${locations.length})` : `Existing Warehouses (${warehouses.length})`}
            </h3>
            <button
              onClick={fetchData}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {activeSubView === 'location' ? (
              locations.map(loc => (
                <div key={loc.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{loc.name}</span>
                    <span className="text-slate-400">{loc.warehouse_name || 'Global'} • {loc.location_type}</span>
                  </div>
                  <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                    {loc.short_code}
                  </span>
                </div>
              ))
            ) : (
              warehouses.map(wh => (
                <div key={wh.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{wh.name}</span>
                    <span className="text-slate-400">{wh.address || 'No address'}</span>
                  </div>
                  <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                    {wh.short_code}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}