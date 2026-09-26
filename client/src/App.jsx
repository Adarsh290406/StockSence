import { useState } from 'react'
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import Operations from './views/Operations';
import Stock from './views/Stock';
import MoveHistory from './views/MoveHistory';
import Settings from './views/Settings';


export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showFolderView, setShowFolderView] = useState(false);


return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onToggleFolderView={() => setShowFolderView(true)}
        showFolderView={showFolderView}
      />

      {/* Main View Router */}
      <main className="flex-1 transition-all">
        {activeTab === 'Dashboard' && <Dashboard onNavigateToOperations={() => setActiveTab('Operations')} />}
        {activeTab === 'Operations' && <Operations />}
        {activeTab === 'Stock' && <Stock />}
        {activeTab === 'Move History' && <MoveHistory />}
        {activeTab === 'Settings' && <Settings />}
      </main>

    </div>
  );
}


