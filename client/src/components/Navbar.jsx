// src/components/Navbar.jsx
import React from 'react';
import { Box, ChevronDown, User } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = ['Dashboard', 'Operations', 'Stock', 'Move History', 'Settings'];

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Logo & Brand */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('Dashboard')}>
          <div className="bg-slate-900 text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
            <Box className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">StockSense</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item;
            return (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item}
                {(item === 'Operations' || item === 'Settings') && (
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Terminal Dropdown Selector */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
          <Box className="w-3.5 h-3.5 text-blue-600" />
          <span>Main Terminal WH-01</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* User Profile Avatar */}
        <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-800 transition-colors">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}