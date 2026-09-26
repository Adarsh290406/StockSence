import { useState, useEffect } from 'react'
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import Operations from './views/Operations';
import Stock from './views/Stock';
import MoveHistory from './views/MoveHistory';
import WarehouseView from './views/WarehouseView';
import LocationView from './views/LocationView';
import AuthModal from './views/AuthModal';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showFolderView, setShowFolderView] = useState(false);

  useEffect(() => {
    const existingUser = api.getUser();
    const token = api.getToken();
    if (existingUser && token) {
      setUser(existingUser);
    }
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
  };

  if (!user) {
    return <AuthModal onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onToggleFolderView={() => setShowFolderView(true)}
        showFolderView={showFolderView}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main View Router matching Excalidraw */}
      <main className="flex-1 transition-all">
        {activeTab === 'Dashboard' && (
          <Dashboard 
            onNavigateToOperations={(type = 'ALL') => setActiveTab(type === 'receipt' ? 'Operations-Receipts' : type === 'delivery' ? 'Operations-Deliveries' : 'Operations')} 
          />
        )}
        {activeTab === 'Operations' && <Operations initialFilter="ALL" />}
        {activeTab === 'Operations-Receipts' && <Operations initialFilter="RECEIPT" />}
        {activeTab === 'Operations-Deliveries' && <Operations initialFilter="DELIVERY" />}
        {activeTab === 'Operations-Adjustments' && <Operations initialFilter="INTERNAL" />}
        {activeTab === 'Operations-Transfers' && <Operations initialFilter="INTERNAL" />}
        {activeTab === 'Stock' && <Stock />}
        {activeTab === 'Move History' && <MoveHistory />}
        {activeTab === 'Settings-Warehouses' && <WarehouseView />}
        {activeTab === 'Settings-Locations' && <LocationView />}
        {activeTab === 'Settings' && <LocationView />}
      </main>
    </div>
  );
}


