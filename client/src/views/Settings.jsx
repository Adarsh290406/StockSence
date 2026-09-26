// src/views/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Warehouse, MapPin } from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showWhModal, setShowWhModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [newWh, setNewWh] = useState({ name: '', short_code: '', address: '' });
  const [newLoc, setNewLoc] = useState({ warehouse_id: '', name: '', short_code: '', location_type: 'internal' });

  const fetchData = async () => {
    try {
      const [whRes, locRes] = await Promise.all([
        api.getWarehouses(),
        api.getLocations()
      ]);
      if (whRes.success) setWarehouses(whRes.data);
      if (locRes.success) setLocations(locRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      await api.createWarehouse(newWh);
      setShowWhModal(false);
      setNewWh({ name: '', short_code: '', address: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    try {
      await api.createLocation({
        ...newLoc,
        warehouse_id: newLoc.warehouse_id ? Number(newLoc.warehouse_id) : null
      });
      setShowLocModal(false);
      setNewLoc({ warehouse_id: '', name: '', short_code: '', location_type: 'internal' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouses & Locations Settings</h1>
        <p className="text-sm text-slate-500">Manage multi-warehouse hierarchy, racks, production bays, and vendor/customer terminals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Warehouses Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Warehouse className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Warehouses ({warehouses.length})</h3>
            </div>
            <button 
              onClick={() => setShowWhModal(true)}
              className="flex items-center space-x-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {warehouses.map(w => (
              <div key={w.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{w.name}</span>
                  <p className="text-xs text-slate-400">{w.address || 'No address specified'}</p>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                  {w.short_code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Locations Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Locations & Bins ({locations.length})</h3>
            </div>
            <button 
              onClick={() => setShowLocModal(true)}
              className="flex items-center space-x-1 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {locations.map(l => (
              <div key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{l.name}</span>
                  <p className="text-xs text-slate-400">{l.warehouse_name || 'Global'} • Type: {l.location_type}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded block">
                    {l.short_code}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{l.total_items_on_hand || 0} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {showWhModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Add Warehouse</h3>
            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Warehouse Name</label>
                <input 
                  type="text" 
                  required
                  value={newWh.name}
                  onChange={(e) => setNewWh({...newWh, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. West Coast Distribution"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Short Code</label>
                <input 
                  type="text" 
                  required
                  value={newWh.short_code}
                  onChange={(e) => setNewWh({...newWh, short_code: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase"
                  placeholder="e.g. WCD"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Address</label>
                <input 
                  type="text" 
                  value={newWh.address}
                  onChange={(e) => setNewWh({...newWh, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. 500 Industrial Ave"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowWhModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Add Location / Bin</h3>
            <form onSubmit={handleCreateLocation} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Parent Warehouse</label>
                <select 
                  value={newLoc.warehouse_id}
                  onChange={(e) => setNewLoc({...newLoc, warehouse_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.short_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Location Name</label>
                <input 
                  type="text" 
                  required
                  value={newLoc.name}
                  onChange={(e) => setNewLoc({...newLoc, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. WH/Rack D - Shelf 02"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Short Code</label>
                <input 
                  type="text" 
                  required
                  value={newLoc.short_code}
                  onChange={(e) => setNewLoc({...newLoc, short_code: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase"
                  placeholder="e.g. WH-RACK-D2"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Location Type</label>
                <select 
                  value={newLoc.location_type}
                  onChange={(e) => setNewLoc({...newLoc, location_type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="internal">Internal (Warehouse Storage / Rack / Shelf)</option>
                  <option value="vendor">Vendor (External Inbound Source)</option>
                  <option value="customer">Customer (External Outbound Target)</option>
                  <option value="inventory_loss">Inventory Loss / Scrap</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowLocModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}