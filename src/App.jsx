import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Customers from './components/Customers';
import Products from './components/Products';
import Orders from './components/Orders';
import Reports from './components/Reports';
import Dashboard from './components/Dashboard';
import { LogOut } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const tabs = [
    { id: 'customers', label: 'KHÁCH HÀNG' },
    { id: 'products', label: 'SẢN PHẨM' },
    { id: 'orders', label: 'ĐƠN HÀNG' },
    { id: 'reports', label: 'BÁO CÁO' },
    { id: 'dashboard', label: 'DASHBOARD' },
  ];

  if (!session) {
    return <Login />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'customers': return <Customers />;
      case 'products': return <Products />;
      case 'orders': return <Orders />;
      case 'reports': return <Reports />;
      case 'dashboard': return <Dashboard />;
      default: return <Customers />;
    }
  };

  return (
    <div className="container">
      <header className="glass-panel" style={{ position: 'relative', marginBottom: '40px', textAlign: 'center', padding: '30px', borderRadius: '0 0 32px 32px' }}>
        <div style={{ position: 'absolute', top: '30px', right: '30px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>{session.user.email}</span>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            <LogOut size={14} /> Thoát
          </button>
        </div>
        <h1 className="glow-text" style={{ color: 'var(--primary-orange)', fontSize: '42px', fontWeight: '900', letterSpacing: '6px', margin: 0 }}>TANAVA APP</h1>
        <p style={{ color: 'white', fontWeight: '600', fontSize: '15px', marginTop: '8px', opacity: 0.8, letterSpacing: '2px' }}>HỆ THỐNG QUẢN LÝ THỰC PHẨM TƯƠI SỐNG</p>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="tabs-header">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main>
        {renderTabContent()}
      </main>

      <footer className="glass-panel" style={{ marginTop: '60px', padding: '50px', textAlign: 'center', borderRadius: '32px 32px 0 0' }}>
        <h4 style={{ color: 'var(--primary-orange)', fontSize: '20px', fontWeight: '800', marginBottom: '15px', letterSpacing: '1px' }}>Công ty TNHH TM DV Thực Phẩm Tân Nam Vang</h4>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '5px' }}>Địa chỉ: Lô 16/18 Hưng Phú, Phường Chánh Hưng, Tp HCM</p>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>MST: 0317426213 | SĐT: 0965551315</p>
        <div style={{ marginTop: '40px', height: '1px', background: 'var(--glass-border)', width: '50%', margin: '40px auto' }}></div>
        <p style={{ fontSize: '12px', opacity: 0.4, letterSpacing: '1px' }}>&copy; 2026 Admin Panel. Crafted with Excellence.</p>
      </footer>
    </div>
  );
}

export default App;
