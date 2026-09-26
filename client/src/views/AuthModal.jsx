// src/views/AuthModal.jsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { LogIn, UserPlus, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthModal({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('manager@stocksense.com');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState('inventory_manager');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        if (res.success) {
          onLoginSuccess(res.user);
        }
      } else if (mode === 'signup') {
        const res = await api.signup(name, email, password, role);
        if (res.success) {
          onLoginSuccess(res.user);
        }
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setMessage(`OTP Generated: ${res.otp} (Valid for 10 minutes)`);
        setMode('reset');
      } else if (mode === 'reset') {
        const res = await api.resetPassword(email, otp, newPassword);
        setMessage('Password reset successfully! Please log in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">StockSense IMS</h2>
          <p className="text-xs text-slate-500 font-medium">PostgreSQL Relational ERP & Logistics Engine</p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button 
            type="button" 
            onClick={() => { setMode('login'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${mode === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
          >
            Log In
          </button>
          <button 
            type="button" 
            onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
          >
            Sign Up
          </button>
          <button 
            type="button" 
            onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${mode === 'forgot' || mode === 'reset' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
          >
            Reset OTP
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adarsh Sharma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@stocksense.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Role Assignment</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="inventory_manager">Inventory Manager</option>
                <option value="warehouse_staff">Warehouse Staff</option>
              </select>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">6-Digit OTP Code</label>
                <input 
                  type="text" 
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-center tracking-widest focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Dashboard' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send 6-Digit OTP' : 'Update Password'}
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-500 space-y-1">
          <span className="font-bold text-slate-700 block">Judge / Demo Quick Login:</span>
          <div>📧 <span className="font-mono text-slate-900">manager@stocksense.com</span></div>
          <div>🔑 <span className="font-mono text-slate-900">admin123</span></div>
        </div>
      </div>
    </div>
  );
}
