import React from 'react';

export default function MoveHistory() {
  const history = [
    { id: 'MOV-9921', type: 'Transfer', desc: 'Moved 500 units SKU-711 from Zone A to Zone C', user: 'Mark R.', time: 'Today, 10:42 AM' },
    { id: 'MOV-9920', type: 'Receipt', desc: 'Received 1,200 units SKU-990 at Bay SEC-IN-01', user: 'Sarah T.', time: 'Today, 09:15 AM' },
    { id: 'MOV-9919', type: 'Dispatch', desc: 'Dispatched 320 units SKU-882 to Logistics Hub B', user: 'Alex K.', time: 'Yesterday, 04:20 PM' },
    { id: 'MOV-9918', type: 'Adjustment', desc: 'Inventory audit correction (+12 units SKU-504)', user: 'Supervisor', time: 'Yesterday, 01:05 PM' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Move History & Audit Trail</h1>
        <p className="text-sm text-slate-500">Complete log of all inventory transfers, receipts, and dispatches.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {history.map(item => (
          <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                LOG
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-semibold text-blue-600">{item.type}</span>
                </div>
                <p className="font-semibold text-slate-900 text-sm mt-0.5">{item.desc}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-slate-700 block">{item.user}</span>
              <span className="text-xs text-slate-400">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}