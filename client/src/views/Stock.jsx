// src/views/Stock.jsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Check, Edit2, X } from 'lucide-react';
import { api } from '../services/api';

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProd, setNewProd] = useState({ name: '', sku: '', uom: 'Units', per_unit_cost: 0, min_stock_alert: 5 });
  const [editingId, setEditingId] = useState(null);
  const [editOnHand, setEditOnHand] = useState(0);
  const [savingStock, setSavingStock] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await api.getProducts({ search });
      if (res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      setError('Failed to load products from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct(newProd);
      setShowAddModal(false);
      setNewProd({ name: '', sku: '', uom: 'Units', per_unit_cost: 0, min_stock_alert: 5 });
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditStock = (item) => {
    setEditingId(item.id);
    setEditOnHand(Number(item.total_on_hand || 0));
  };

  const handleUpdateStock = async (productId) => {
    setSavingStock(true);
    try {
      await api.adjustProductStock(productId, editOnHand);
      setEditingId(null);
      await fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to update stock in PostgreSQL');
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header strictly matching Excalidraw */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Stock
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Right Search Input */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Stock Table with exact columns from Excalidraw: Product | per unit cost | On hand | free to Use */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Product</th>
                <th className="p-4">Per Unit Cost</th>
                <th className="p-4">On Hand</th>
                <th className="p-4">Free to Use</th>
                <th className="p-4 text-right">Update Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading live PostgreSQL stock...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400">
                    No products found in PostgreSQL database.
                  </td>
                </tr>
              ) : (
                products.map(item => {
                  const onHand = Number(item.total_on_hand || 0);
                  const available = Number(item.total_available || 0);
                  const isEditing = editingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Product Column */}
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-xs font-mono text-slate-400">{item.sku}</span>
                      </td>

                      {/* Per unit cost Column */}
                      <td className="p-4 font-mono font-medium text-slate-700">
                        {Number(item.per_unit_cost || 0).toLocaleString()} Rs
                      </td>

                      {/* On hand Column with Inline Editing capability */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              value={editOnHand}
                              onChange={(e) => setEditOnHand(Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-blue-400 rounded-lg text-sm font-bold bg-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateStock(item.id)}
                              disabled={savingStock}
                              title="Save Stock"
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              title="Cancel"
                              className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-extrabold text-slate-900 text-base">
                            {onHand}
                          </span>
                        )}
                      </td>

                      {/* Free to Use Column */}
                      <td className="p-4 font-extrabold text-emerald-700 text-base">
                        {available}
                      </td>

                      {/* Update Stock Action button */}
                      <td className="p-4 text-right">
                        {!isEditing && (
                          <button
                            onClick={() => startEditStock(item)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Stock</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        User must be able to update the stock from here. (Changes immediately update physical stock & write to PostgreSQL audit ledger)
      </p>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Add New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. Desk"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  value={newProd.sku}
                  onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase"
                  placeholder="e.g. FURN-DESK-01"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={newProd.uom}
                    onChange={(e) => setNewProd({ ...newProd, uom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Per Unit Cost (Rs)</label>
                  <input
                    type="number"
                    value={newProd.per_unit_cost}
                    onChange={(e) => setNewProd({ ...newProd, per_unit_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Min Stock Alert Level</label>
                <input
                  type="number"
                  value={newProd.min_stock_alert}
                  onChange={(e) => setNewProd({ ...newProd, min_stock_alert: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Save to PostgreSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}