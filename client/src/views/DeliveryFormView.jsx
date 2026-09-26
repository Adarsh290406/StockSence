// src/views/DeliveryFormView.jsx
import React, { useState, useEffect } from 'react';
import { Printer, Check, X, Plus, Trash2, ArrowLeft, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function DeliveryFormView({ opId = null, onBack, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Form State matching Excalidraw Delivery Wireframe
  const [form, setForm] = useState({
    id: null,
    reference_no: 'WH/OUT/0001 (New)',
    partner_name: 'Azure Interior', // Delivery Address / Customer
    responsible: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    operation_type_label: 'Delivery Orders',
    source_location_id: '',
    dest_location_id: '',
    status: 'draft', // 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
    items: [
      { product_id: '', product_name: '', sku: '', demand_qty: 1, current_stock: 0 }
    ]
  });

  useEffect(() => {
    const user = api.getUser();
    if (user) {
      setCurrentUser(user);
      setForm(prev => ({
        ...prev,
        responsible: user.name || user.email || 'Adarsh'
      }));
    }

    const loadAuxData = async () => {
      try {
        const [prodRes, locRes] = await Promise.all([
          api.getProducts(),
          api.getLocations()
        ]);
        if (prodRes && prodRes.success) setProducts(prodRes.data || []);
        if (locRes && locRes.success) setLocations(locRes.data || []);
      } catch (err) {
        console.error('Failed to load products/locations:', err);
      }
    };
    loadAuxData();

    if (opId) {
      loadOperation(opId);
    }
  }, [opId]);

  const loadOperation = async (id) => {
    setLoading(true);
    try {
      const res = await api.getOperation(id);
      if (res.success && res.data) {
        const op = res.data;
        setForm({
          id: op.id,
          reference_no: op.reference_no,
          partner_name: op.partner_name || '',
          responsible: op.created_by_name || (currentUser ? currentUser.name : 'Adarsh'),
          scheduled_date: op.scheduled_date ? op.scheduled_date.split('T')[0] : '',
          operation_type_label: 'Delivery Orders',
          source_location_id: op.source_location_id || '',
          dest_location_id: op.dest_location_id || '',
          status: op.status || 'draft',
          items: op.items && op.items.length > 0
            ? op.items.map(it => ({
                id: it.id,
                product_id: it.product_id,
                product_name: it.product_name,
                sku: it.product_sku,
                demand_qty: it.demand_qty,
                done_qty: it.done_qty,
                current_stock: it.current_stock ?? 0
              }))
            : [{ product_id: '', product_name: '', sku: '', demand_qty: 1, current_stock: 0 }]
        });
      }
    } catch (err) {
      console.error('Failed to load delivery:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', product_name: '', sku: '', demand_qty: 1, current_stock: 0 }]
    }));
  };

  const handleRemoveRow = (index) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemProductChange = (index, productId) => {
    const selectedProd = products.find(p => String(p.id) === String(productId));
    const updated = [...form.items];
    const availableStock = selectedProd ? Number(selectedProd.free_to_use ?? selectedProd.on_hand ?? 0) : 0;
    
    updated[index] = {
      ...updated[index],
      product_id: productId,
      product_name: selectedProd ? selectedProd.name : '',
      sku: selectedProd ? selectedProd.sku : '',
      current_stock: availableStock
    };

    // Auto-calculate waiting/ready status based on stock availability
    checkAndAdjustWaitingStatus(updated);
  };

  const handleItemQtyChange = (index, qty) => {
    const updated = [...form.items];
    updated[index].demand_qty = Math.max(1, Number(qty) || 1);
    checkAndAdjustWaitingStatus(updated);
  };

  const checkAndAdjustWaitingStatus = (items) => {
    const hasOutOfStock = items.some(it => {
      if (!it.product_id) return false;
      const prod = products.find(p => String(p.id) === String(it.product_id));
      const avail = prod ? Number(prod.free_to_use ?? prod.on_hand ?? 0) : (it.current_stock ?? 0);
      return Number(it.demand_qty) > avail;
    });

    setForm(prev => ({
      ...prev,
      items,
      status: prev.status === 'done' || prev.status === 'canceled' 
        ? prev.status 
        : hasOutOfStock 
          ? 'waiting' 
          : prev.status === 'waiting' 
            ? 'ready' 
            : prev.status
    }));
  };

  const isOutOfStockItem = (item) => {
    if (!item.product_id) return false;
    const prod = products.find(p => String(p.id) === String(item.product_id));
    const avail = prod ? Number(prod.free_to_use ?? prod.on_hand ?? 0) : (item.current_stock ?? 0);
    return Number(item.demand_qty) > avail;
  };

  // Excalidraw Flow:
  // Initial stage: Draft
  // Waiting: Waiting for the rest of stock product to be in stock
  // Ready: Ready to deliver / receive
  // Done: Received or delivered
  const handleValidate = async () => {
    if (!form.id) {
      await handleSaveAndAction('validate');
      return;
    }

    if (form.status === 'draft') {
      const anyOOS = form.items.some(it => isOutOfStockItem(it));
      setForm(prev => ({ ...prev, status: anyOOS ? 'waiting' : 'ready' }));
      return;
    }

    if (form.status === 'waiting') {
      alert('Cannot finalize delivery while items are waiting for stock replenishment.');
      return;
    }

    if (form.status === 'ready') {
      try {
        setLoading(true);
        await api.validateOperation(form.id);
        setForm(prev => ({ ...prev, status: 'done' }));
        if (onSaved) onSaved();
      } catch (err) {
        alert('Validation failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveAndAction = async (action = 'save') => {
    try {
      setLoading(true);
      const payload = {
        operation_type: 'delivery',
        partner_name: form.partner_name,
        source_location_id: form.source_location_id ? Number(form.source_location_id) : null,
        dest_location_id: form.dest_location_id ? Number(form.dest_location_id) : null,
        scheduled_date: form.scheduled_date,
        items: form.items
          .filter(it => it.product_id)
          .map(it => ({
            product_id: Number(it.product_id),
            demand_qty: Number(it.demand_qty)
          }))
      };

      if (payload.items.length === 0) {
        alert('Please add at least one product line.');
        setLoading(false);
        return;
      }

      const res = await api.createOperation(payload);
      if (res.success && res.data) {
        const createdId = res.data.id;
        if (action === 'validate' && form.status !== 'waiting') {
          await api.validateOperation(createdId);
        }
        if (onSaved) onSaved();
        if (onBack) onBack();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCancel = async () => {
    if (form.id && form.status !== 'done' && form.status !== 'canceled') {
      if (window.confirm('Cancel this delivery order?')) {
        try {
          await api.cancelOperation(form.id);
          setForm(prev => ({ ...prev, status: 'canceled' }));
          if (onSaved) onSaved();
        } catch (err) {
          alert('Cancel failed: ' + err.message);
        }
      }
    } else {
      if (onBack) onBack();
    }
  };

  const isDone = form.status === 'done';
  const isCanceled = form.status === 'canceled';
  const hasOutOfStock = form.items.some(it => isOutOfStockItem(it));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in print:p-0 print:max-w-full">
      {/* Top Breadcrumb / Back button */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 text-slate-600 hover:text-blue-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Operations</span>
        </button>
        <span>/</span>
        <span className="text-slate-800 font-bold">Delivery</span>
      </div>

      {/* Main Form Box matching Excalidraw Delivery Wireframe */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 lg:p-8 space-y-6">
        
        {/* Top Header Row: Action Buttons on Left, Stages Pill on Right */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          
          {/* Action Buttons: New, Validate, Print, Cancel */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              type="button"
              onClick={() => {
                setForm({
                  id: null,
                  reference_no: 'WH/OUT/0001 (New)',
                  partner_name: '',
                  responsible: currentUser ? currentUser.name : 'Adarsh',
                  scheduled_date: new Date().toISOString().split('T')[0],
                  operation_type_label: 'Delivery Orders',
                  source_location_id: '',
                  dest_location_id: '',
                  status: 'draft',
                  items: [{ product_id: '', product_name: '', sku: '', demand_qty: 1, current_stock: 0 }]
                });
              }}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              New
            </button>

            {!isDone && !isCanceled && (
              <button
                type="button"
                onClick={handleValidate}
                disabled={loading || form.status === 'waiting'}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center space-x-1 ${
                  form.status === 'waiting'
                    ? 'bg-amber-500 text-white opacity-80 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {form.status === 'draft' ? 'Validate' : form.status === 'waiting' ? 'Waiting Stock' : 'Validate (Mark Done)'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {!isDone && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Stages Tracker Pill matching Excalidraw: Draft > Waiting > Ready > Done */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <span
              className={`px-2.5 py-1 rounded-lg transition-all ${
                form.status === 'draft'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Draft
            </span>
            <span className="text-slate-300 mx-1">&gt;</span>
            <span
              className={`px-2.5 py-1 rounded-lg transition-all ${
                form.status === 'waiting'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Waiting
            </span>
            <span className="text-slate-300 mx-1">&gt;</span>
            <span
              className={`px-2.5 py-1 rounded-lg transition-all ${
                form.status === 'ready'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Ready
            </span>
            <span className="text-slate-300 mx-1">&gt;</span>
            <span
              className={`px-2.5 py-1 rounded-lg transition-all ${
                form.status === 'done'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Done
            </span>
            {form.status === 'canceled' && (
              <>
                <span className="text-slate-300 mx-1">&gt;</span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700">
                  Canceled
                </span>
              </>
            )}
          </div>
        </div>

        {/* Reference & Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-mono font-black text-slate-900 tracking-tight">
              {form.reference_no}
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-md">
              Delivery
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Delivery Address, Responsible */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  disabled={isDone || isCanceled}
                  value={form.partner_name}
                  onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                  placeholder="e.g. Azure Interior / Client Address"
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Responsible
                </label>
                <input
                  type="text"
                  disabled={true}
                  value={form.responsible}
                  placeholder="Autofill with current logged in user"
                  className="w-full px-3 py-2 bg-slate-100/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Autofill with the current logged-in user
                </span>
              </div>
            </div>

            {/* Right Column: Schedule Date, Operation Type */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Schedule Date
                </label>
                <input
                  type="date"
                  disabled={isDone || isCanceled}
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Operation Type
                </label>
                <div className="relative">
                  <select
                    disabled={isDone || isCanceled}
                    value={form.operation_type_label}
                    onChange={(e) => setForm({ ...form, operation_type_label: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="Delivery Orders">Delivery Orders</option>
                    <option value="Internal Transfers">Internal Transfers</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table matching Excalidraw Wireframe & Out-of-stock Alert Notice */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Products
            </h2>
            {hasOutOfStock && (
              <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alert: Waiting for the rest of stock product to be in stock</span>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5 w-36">Quantity</th>
                  {!isDone && !isCanceled && <th className="p-3.5 w-12 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {form.items.map((item, idx) => {
                  const isOOS = isOutOfStockItem(item);

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        isOOS
                          ? 'bg-rose-50/80 text-rose-900 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="p-3">
                        {isDone || isCanceled ? (
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">
                              [{item.sku || 'SKU'}] {item.product_name || 'Product'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleItemProductChange(idx, e.target.value)}
                              className={`w-full px-3 py-1.5 bg-white border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isOOS ? 'border-rose-300' : 'border-slate-200'
                              }`}
                            >
                              <option value="">Select product...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  [{p.sku}] {p.name} (Stock: {p.free_to_use ?? p.on_hand ?? 0})
                                </option>
                              ))}
                            </select>
                            {isOOS && (
                              <p className="text-[11px] font-bold text-rose-600 flex items-center space-x-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Product is not in stock (Demand: {item.demand_qty} &gt; Available: {products.find(p => String(p.id) === String(item.product_id))?.free_to_use ?? 0})</span>
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top">
                        {isDone || isCanceled ? (
                          <span className="font-bold text-slate-900 font-mono">
                            {item.demand_qty}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            value={item.demand_qty}
                            onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                            className={`w-full px-3 py-1.5 bg-white border rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isOOS ? 'border-rose-300 text-rose-700 bg-rose-50/50' : 'border-slate-200 text-slate-900'
                            }`}
                          />
                        )}
                      </td>
                      {!isDone && !isCanceled && (
                        <td className="p-3 text-center align-top">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Remove row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Add New Product Row matching Excalidraw wireframe */}
            {!isDone && !isCanceled && (
              <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add new product</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save Bar if new */}
        {!form.id && (
          <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveAndAction('save')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center space-x-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Save Delivery</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
