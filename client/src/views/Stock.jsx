// src/views/Stock.jsx
import React from 'react';
import { Search } from 'lucide-react';

export default function Stock() {
  const inventory = [
    { sku: 'SKU-990', name: 'Precision Microchips (Batch A)', category: 'Electronics', stock: 1420, bin: 'A-01-12', status: 'Optimal' },
    { sku: 'SKU-882', name: 'Industrial Hydraulic Hoses', category: 'Hardware', stock: 320, bin: 'B-04-02', status: 'Low Stock' },
    { sku: 'SKU-711', name: 'High-Density Polymer Panels', category: 'Raw Materials', stock: 2450, bin: 'C-02-09', status: 'Optimal' },
    { sku: 'SKU-504', name: 'Automated Sensor Relays', category: 'Electronics', stock: 89, bin: 'A-03-01', status: 'Critical' },
    { sku: 'SKU-312', name: 'Heavy Duty Steel Brackets', category: 'Hardware', stock: 1100, bin: 'B-01-05', status: 'Optimal' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Stock Catalog</h1>
          <p className="text-sm text-slate-500">Real-time stock levels across terminal bin locations.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search SKU or item name..." 
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-xs"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">SKU / Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Bin Location</th>
                <th className="p-4">Stock Units</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {inventory.map(item => (
                <tr key={item.sku} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-xs font-mono text-slate-400">{item.sku}</span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{item.category}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold text-slate-700">
                      {item.bin}
                    </span>
                  </td>
                  <td className="p-4 font-extrabold text-slate-900">{item.stock.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.status === 'Optimal' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}