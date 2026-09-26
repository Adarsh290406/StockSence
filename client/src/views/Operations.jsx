// src/views/Operations.jsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function Operations() {
  const [filter, setFilter] = useState('ALL');

  const tasks = [
    { id: 'REC-1092', type: 'Receipt', title: 'Pallet Intake: Electronics (SKU-990)', status: 'Late', time: '08:30 AM', bay: 'SEC-IN-01' },
    { id: 'REC-1093', type: 'Receipt', title: 'Bulk Containers: Raw Materials', status: 'In Progress', time: '10:15 AM', bay: 'SEC-IN-02' },
    { id: 'DEL-4011', type: 'Delivery', title: 'Express Freight dispatch #401', status: 'Late', time: '09:00 AM', bay: 'BAY-OUT-04' },
    { id: 'DEL-4012', type: 'Delivery', title: 'Retail replenishment batch A', status: 'Waiting', time: '11:30 AM', bay: 'BAY-OUT-02' },
    { id: 'REC-1094', type: 'Receipt', title: 'Scheduled component crates', status: 'Scheduled', time: '02:00 PM', bay: 'SEC-IN-01' },
  ];

  const filteredTasks = filter === 'ALL' 
    ? tasks 
    : tasks.filter(t => t.status.toUpperCase() === filter || t.type.toUpperCase() === filter);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Control Center</h1>
          <p className="text-sm text-slate-500">Monitor active inbound receipts and outbound dispatch pipelines.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl p-1 shadow-xs overflow-x-auto">
          {['ALL', 'LATE', 'WAITING', 'RECEIPT', 'DELIVERY'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filter === tab ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Tasks Queue ({filteredTasks.length})
          </span>
          <button className="flex items-center space-x-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>New Operation</span>
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No tasks found matching this filter.
            </div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    task.type === 'Receipt' 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {task.type === 'Receipt' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-400">{task.id}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-semibold text-slate-600">{task.bay}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{task.title}</h4>
                  </div>
                </div>
                <div className="flex items-center space-x-3 self-end sm:self-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    task.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'Waiting' ? 'bg-slate-200 text-slate-700' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {task.status}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{task.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}