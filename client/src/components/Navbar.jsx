// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Box, ChevronDown, User, LogOut, Download, Truck, ArrowLeftRight, Settings as SettingsIcon, Layers } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout }) {
  const [showOpsMenu, setShowOpsMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Brand & Main Excalidraw Navigation */}
      <div className="flex items-center gap-8">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setActiveTab('Dashboard')}
        >
          <div className="bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Box className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">StockSense</span>
        </div>

        {/* Navigation Tabs matching Excalidraw */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('Dashboard')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'Dashboard' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Dashboard
          </button>

          {/* Operations Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowOpsMenu(!showOpsMenu); setShowSettingsMenu(false); }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTab.startsWith('Operations') ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Operations</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showOpsMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-fade-in space-y-1">
                <button
                  onClick={() => { setActiveTab('Operations-Receipts'); setShowOpsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Receipts</span>
                </button>
                <button
                  onClick={() => { setActiveTab('Operations-Deliveries'); setShowOpsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2"
                >
                  <Truck className="w-4 h-4 text-purple-500" />
                  <span>Deliveries</span>
                </button>
                <button
                  onClick={() => { setActiveTab('Operations-Adjustments'); setShowOpsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                  <span>Adjustments</span>
                </button>
              </div>
            )}
          </div>

          {/* Stock */}
          <button
            onClick={() => setActiveTab('Stock')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'Stock' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Stock
          </button>

          {/* Move History */}
          <button
            onClick={() => setActiveTab('Move History')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'Move History' ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            Move History
          </button>

          {/* Settings Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowOpsMenu(false); }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${activeTab.startsWith('Settings') ? 'bg-blue-50 text-blue-600 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <span>Settings</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showSettingsMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-fade-in space-y-1">
                <button
                  onClick={() => { setActiveTab('Settings-Warehouses'); setShowSettingsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4 text-blue-500" />
                  <span>Warehouses</span>
                </button>
                <button
                  onClick={() => { setActiveTab('Settings-Locations'); setShowSettingsMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>Locations / Bins</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right User & Profile Control */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline">{user?.name || 'User'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-fade-in space-y-2">
              <div className="border-b border-slate-100 pb-2">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs font-mono text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => { onLogout(); setShowUserMenu(false); }}
                className="w-full text-left px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
