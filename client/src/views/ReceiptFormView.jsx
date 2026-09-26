// src/views/ReceiptFormView.jsx
import React, { useState, useEffect } from 'react';
import { Printer, Check, X, Plus, Trash2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ReceiptFormView({ opId = null, onBack, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Form State matching Excalidraw Receipt Wireframe
  const [form, setForm] = useState({
    id: null,
    reference_no: 'WH/IN/0001 (New)',
    partner_name: 'Azure Interior',
    responsible: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    source_location_id: '',
    dest_location_id: '',
    status: 'draft', // 'draft' | 'ready' | 'done' | 'canceled'
    items: [
      { product_id: '', product_name: '', sku: '', demand_qty: 1 }
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
                done_qty: it.done_qty
              }))
            : [{ product_id: '', product_name: '', sku: '', demand_qty: 1 }]
        });
      }
    } catch (err) {
      console.error('Failed to load receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', product_name: '', sku: '', demand_qty: 1 }]
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
    updated[index] = {
      ...updated[index],
      product_id: productId,
      product_name: selectedProd ? selectedProd.name : '',
      sku: selectedProd ? selectedProd.sku : ''
    };
    setForm(prev => ({ ...prev, items: updated }));
  };

  const handleItemQtyChange = (index, qty) => {
    const updated = [...form.items];
    updated[index].demand_qty = Math.max(1, Number(qty) || 1);
    setForm(prev => ({ ...prev, items: updated }));
  };

  // Stage Transitions per Excalidraw:
  // Initial stage = Draft
  // On click TODO / Set Ready -> moves to Ready
  // On click Validate -> moves to Done (and updates stock in PostgreSQL)
  const handleValidate = async () => {
    if (!form.id) {
      await handleSaveAndAction('validate');
      return;
    }

    if (form.status === 'draft') {
      setForm(prev => ({ ...prev, status: 'ready' }));
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
        operation_type: 'receipt',
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
        if (action === 'validate') {
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
      if (window.confirm('Cancel this receipt operation?')) {
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
        <span className="text-slate-800 font-bold">Receipt</span>
      </div>

      {/* Main Form Box matching Excalidraw wireframe */}
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
                  reference_no: 'WH/IN/0001 (New)',
                  partner_name: '',
                  responsible: currentUser ? currentUser.name : 'Adarsh',
                  scheduled_date: new Date().toISOString().split('T')[0],
                  source_location_id: '',
                  dest_location_id: '',
                  status: 'draft',
                  items: [{ product_id: '', product_name: '', sku: '', demand_qty: 1 }]
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
                disabled={loading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{form.status === 'draft' ? 'Validate' : 'Validate (Mark Done)'}</span>
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

          {/* Stages Tracker Pill matching Excalidraw: Draft > Ready > Done */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <span
              className={`px-3 py-1 rounded-lg transition-all ${
                form.status === 'draft'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Draft
            </span>
            <span className="text-slate-300 mx-1">&gt;</span>
            <span
              className={`px-3 py-1 rounded-lg transition-all ${
                form.status === 'ready'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Ready
            </span>
            <span className="text-slate-300 mx-1">&gt;</span>
            <span
              className={`px-3 py-1 rounded-lg transition-all ${
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
                <span className="px-3 py-1 rounded-lg bg-rose-100 text-rose-700">
                  Canceled
                </span>
              </>
            )}
          </div>
        </div>

        {/* Reference & Primary Info matching Excalidraw */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-mono font-black text-slate-900 tracking-tight">
              {form.reference_no}
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
              Receipt
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Receive From, Responsible */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Receive From
                </label>
                <input
                  type="text"
                  disabled={isDone || isCanceled}
                  value={form.partner_name}
                  onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                  placeholder="e.g. Azure Interior"
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
                  placeholder="Autofill with the current logged in user"
                  className="w-full px-3 py-2 bg-slate-100/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Autofill with the current logged-in user
                </span>
              </div>
            </div>

            {/* Right Column: Schedule Date, Destination Location */}
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
                  Destination Location
                </label>
                <select
                  disabled={isDone || isCanceled}
                  value={form.dest_location_id}
                  onChange={(e) => setForm({ ...form, dest_location_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">WH/Stock1 (Default)</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.short_code})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table matching Excalidraw wireframe */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Products
          </h2>

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
                {form.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3">
                      {isDone || isCanceled ? (
                        <span className="font-semibold text-slate-800">
                          [{item.sku || 'SKU'}] {item.product_name || 'Product'}
                        </span>
                      ) : (
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-3">
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
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </td>
                    {!isDone && !isCanceled && (
                      <td className="p-3 text-center">
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
                ))}
              </tbody>
            </table>

            {/* Add New Product Row Button matching Excalidraw wireframe */}
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
              <span>Save Receipt</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
