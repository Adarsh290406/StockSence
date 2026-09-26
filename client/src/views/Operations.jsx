import React, { useState, useEffect } from 'react';
import { Plus, Search, List, LayoutGrid, CheckCircle2, AlertCircle, ArrowRight, Eye, RefreshCw, X, Check } from 'lucide-react';
import { api } from '../services/api';
import ReceiptFormView from './ReceiptFormView';
import DeliveryFormView from './DeliveryFormView';

export default function Operations({ initialFilter = 'RECEIPT' }) {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  // Dedicated Form View state: null | { type: 'receipt' | 'delivery' | 'internal', id: number | null }
  const [activeForm, setActiveForm] = useState(null);

  // Modals & Detail views matching Excalidraw sub-wireframes
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);

  // Form State for creating new operation with dynamic line items
  const [newOp, setNewOp] = useState({
    operation_type: 'receipt',
    partner_name: '',
    source_location_id: '',
    dest_location_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    items: [{ product_id: '', demand_qty: 10 }]
  });

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const lowerFilter = (filter || '').toLowerCase();
      const params = {};

      if (['receipt', 'delivery', 'internal', 'adjustment'].includes(lowerFilter)) {
        params.type = lowerFilter;
      } else if (['draft', 'waiting', 'ready', 'done', 'canceled'].includes(lowerFilter)) {
        params.status = lowerFilter;
      }

      const res = await api.getOperations(params);
      if (res.success && Array.isArray(res.data)) {
        setOperations(res.data);
      }
    } catch (err) {
      console.error('Failed to load operations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [prodRes, locRes] = await Promise.all([
        api.getProducts(),
        api.getLocations()
      ]);
      if (prodRes && prodRes.success) setProducts(prodRes.data || []);
      if (locRes && locRes.success) setLocations(locRes.data || []);
    } catch (err) {
      console.error('Failed to load aux data:', err);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [filter]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  const handleAddItemRow = () => {
    setNewOp(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', demand_qty: 1 }]
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...newOp.items];
    updated[index][field] = value;
    setNewOp({ ...newOp, items: updated });
  };

  const handleRemoveItemRow = (index) => {
    if (newOp.items.length <= 1) return;
    setNewOp(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createOperation({
        operation_type: newOp.operation_type,
        partner_name: newOp.partner_name,
        source_location_id: newOp.source_location_id ? Number(newOp.source_location_id) : null,
        dest_location_id: newOp.dest_location_id ? Number(newOp.dest_location_id) : null,
        scheduled_date: newOp.scheduled_date,
        items: newOp.items.map(it => ({
          product_id: Number(it.product_id),
          demand_qty: Number(it.demand_qty)
        }))
      });

      setShowCreateModal(false);
      setNewOp({
        operation_type: filter === 'DELIVERY' ? 'delivery' : filter === 'INTERNAL' ? 'internal' : 'receipt',
        partner_name: '',
        source_location_id: '',
        dest_location_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        items: [{ product_id: '', demand_qty: 10 }]
      });
      fetchOperations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleValidate = async (id, refNo) => {
    if (!window.confirm(`Validate and finalize operation ${refNo}? This will immediately update physical stock in PostgreSQL.`)) return;
    try {
      await api.validateOperation(id);
      if (selectedOp && selectedOp.id === id) {
        setSelectedOp(null);
      }
      fetchOperations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleViewDetail = async (op) => {
    if (op.operation_type === 'receipt') {
      setActiveForm({ type: 'receipt', id: op.id });
      return;
    }
    if (op.operation_type === 'delivery') {
      setActiveForm({ type: 'delivery', id: op.id });
      return;
    }
    try {
      const res = await api.getOperation(op.id);
      if (res.success) {
        setSelectedOp(res.data);
      }
    } catch (err) {
      alert('Failed to load operation detail');
    }
  };

  if (activeForm && activeForm.type === 'receipt') {
    return (
      <ReceiptFormView
        opId={activeForm.id}
        onBack={() => setActiveForm(null)}
        onSaved={() => {
          fetchOperations();
        }}
      />
    );
  }

  if (activeForm && activeForm.type === 'delivery') {
    return (
      <DeliveryFormView
        opId={activeForm.id}
        onBack={() => setActiveForm(null)}
        onSaved={() => {
          fetchOperations();
        }}
      />
    );
  }

  const filteredOps = operations.filter(op => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      op.reference_no?.toLowerCase().includes(s) ||
      op.partner_name?.toLowerCase().includes(s) ||
      op.source_location_name?.toLowerCase().includes(s) ||
      op.dest_location_name?.toLowerCase().includes(s)
    );
  });

  const getPageTitle = () => {
    if (filter === 'RECEIPT') return 'Receipts';
    if (filter === 'DELIVERY') return 'Delivery Orders';
    if (filter === 'INTERNAL') return 'Adjustments';
    return 'Stock Operations';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header Bar strictly positioned per Excalidraw */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: NEW Button + Title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (filter === 'RECEIPT') {
                setActiveForm({ type: 'receipt', id: null });
              } else if (filter === 'DELIVERY') {
                setActiveForm({ type: 'delivery', id: null });
              } else {
                setNewOp(prev => ({
                  ...prev,
                  operation_type: 'receipt'
                }));
                setShowCreateModal(true);
              }
            }}
            className="flex items-center space-x-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NEW</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right Side: Type filter tabs + Search bar + List/Kanban toggle per Excalidraw */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['RECEIPT', 'DELIVERY', 'INTERNAL', 'ALL'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${filter === tab
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or contact..."
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 shadow-xs"
            />
          </div>

          {/* List & Kanban Toggle (Exact Excalidraw Icons) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="Kanban View (by status)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Grid container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading PostgreSQL operations...</span>
          </div>
        ) : filteredOps.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No operations found. Click <strong className="text-blue-600 cursor-pointer" onClick={() => setShowCreateModal(true)}>+ NEW</strong> to create a live record!
          </div>
        ) : viewMode === 'list' ? (
          /* List View matching Excalidraw Columns: Reference | From | To | Contact | Schedule date | Status | Action */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Reference</th>
                  <th className="p-4">From</th>
                  <th className="p-4">To</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Schedule Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOps.map(op => {
                  const isDone = op.status === 'done';
                  const isReady = op.status === 'ready';
                  const isLate = op.scheduled_date && new Date(op.scheduled_date) < new Date() && !isDone;

                  return (
                    <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900 text-xs">
                        <button
                          onClick={() => handleViewDetail(op)}
                          className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer text-left"
                        >
                          {op.reference_no}
                        </button>
                      </td>
                      <td className="p-4 text-slate-600 font-medium text-xs">
                        {op.source_location_name || (op.operation_type === 'receipt' ? 'vendor' : 'WH/Stock')}
                      </td>
                      <td className="p-4 text-slate-600 font-medium text-xs">
                        {op.dest_location_name || (op.operation_type === 'delivery' ? 'customer' : 'WH/Stock1')}
                      </td>
                      <td className="p-4 text-slate-800 font-semibold text-xs">
                        {op.partner_name || 'Azure Interior'}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-mono">
                        {op.scheduled_date ? new Date(op.scheduled_date).toLocaleDateString() : 'Immediate'}
                        {isLate && <span className="ml-1 text-[10px] text-rose-600 font-bold">(Late)</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${isDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            isReady ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              op.status === 'waiting' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                op.status === 'canceled' ? 'bg-slate-100 text-slate-400' :
                                  'bg-slate-100 text-slate-700'
                          }`}>
                          {op.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewDetail(op)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        {!isDone && op.status !== 'canceled' && (
                          <button
                            onClick={() => handleValidate(op.id, op.reference_no)}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                          >
                            Validate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Kanban View by Status */
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50">
            {['draft', 'waiting', 'ready', 'done'].map(statusCol => {
              const items = filteredOps.filter(op => op.status === statusCol);
              return (
                <div key={statusCol} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      {statusCol}
                    </span>
                    <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2.5 flex-1">
                    {items.map(op => (
                      <div key={op.id} className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleViewDetail(op)}
                            className="font-mono text-xs font-bold text-slate-900 hover:text-blue-600"
                          >
                            {op.reference_no}
                          </button>
                          <span className="text-[10px] text-slate-500 font-medium">{op.scheduled_date || 'Today'}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {op.partner_name || 'Internal'}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px] text-slate-500">
                          <span>{op.source_location_name || 'Vendor'} → {op.dest_location_name || 'WH'}</span>
                          {op.status !== 'done' && (
                            <button
                              onClick={() => handleValidate(op.id, op.reference_no)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                            >
                              Validate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">No items</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operation Detail Card Modal matching Excalidraw Form screen */}
      {selectedOp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-5">
            {/* Header with Reference and Status Pill */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200">
                  {selectedOp.operation_type}
                </span>
                <h3 className="font-mono font-extrabold text-xl text-slate-900">{selectedOp.reference_no}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${selectedOp.status === 'done' ? 'bg-emerald-100 text-emerald-800' :
                    selectedOp.status === 'ready' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                  {selectedOp.status}
                </span>
                <button
                  onClick={() => setSelectedOp(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Information Grid matching Excalidraw Form Fields */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Receive From / Contact</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedOp.partner_name || 'vendor'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Destination / Delivery Address</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedOp.dest_location_name || 'WH/Stock1'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Schedule Date</span>
                <p className="font-mono text-slate-700 mt-0.5">{selectedOp.scheduled_date || 'Immediate'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Source Location</span>
                <p className="font-mono text-slate-700 mt-0.5">{selectedOp.source_location_name || 'Vendor Intake'}</p>
              </div>
            </div>

            {/* Line items Table matching Excalidraw Line Item Spec */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Demand Qty</th>
                    <th className="p-3">Done Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOp.items?.map(item => (
                    <tr key={item.id}>
                      <td className="p-3 font-semibold text-slate-800">
                        {item.product_name} <span className="font-mono text-slate-400 font-normal">({item.product_sku})</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.demand_qty} {item.uom}</td>
                      <td className="p-3 font-bold text-emerald-600">{item.done_qty} {item.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400">
                Created by {selectedOp.created_by_name || 'System Admin'}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedOp(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                {selectedOp.status !== 'done' && selectedOp.status !== 'canceled' && (
                  <button
                    onClick={() => handleValidate(selectedOp.id, selectedOp.reference_no)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    Validate & Update Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Operation Modal matching Excalidraw creation requirements */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Create Stock Operation</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Operation Type</label>
                <select
                  value={newOp.operation_type}
                  onChange={(e) => setNewOp({ ...newOp, operation_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  <option value="receipt">Receipt (Vendor → Warehouse)</option>
                  <option value="delivery">Delivery (Warehouse → Customer)</option>
                  <option value="internal">Adjustment (Location → Location)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Partner / Contact Name</label>
                <input
                  type="text"
                  value={newOp.partner_name}
                  onChange={(e) => setNewOp({ ...newOp, partner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                  placeholder="e.g. Azure Interior"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Source Location</label>
                  <select
                    value={newOp.source_location_id}
                    onChange={(e) => setNewOp({ ...newOp, source_location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">Vendor / None</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.short_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Destination Location</label>
                  <select
                    value={newOp.dest_location_id}
                    onChange={(e) => setNewOp({ ...newOp, dest_location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">Customer / None</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.short_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Schedule Date</label>
                <input
                  type="date"
                  value={newOp.scheduled_date}
                  onChange={(e) => setNewOp({ ...newOp, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    + Add Row
                  </button>
                </div>

                {newOp.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-7">
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                      >
                        <option value="">Select product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.demand_qty}
                        onChange={(e) => handleItemChange(idx, 'demand_qty', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {newOp.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Create in PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}