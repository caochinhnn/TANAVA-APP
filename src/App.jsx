import { supabase } from './supabaseClient';
import Login from './components/Login';
import { LogOut } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');

  React.useEffect(() => {
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
      <header style={{ position: 'relative', marginBottom: '30px', textAlign: 'center', background: 'white', padding: '20px', borderRadius: '0 0 15px 15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>{session.user.email}</span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#444'
            }}
          >
            <LogOut size={16} /> Thoát
          </button>
        </div>
        <h1 style={{ color: 'var(--primary-orange)', fontSize: '36px', letterSpacing: '3px', margin: 0 }}>TANAVA APP</h1>
        <p style={{ color: '#000', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>HỆ THỐNG QUẢN LÝ THỰC PHẨM TƯƠI SỐNG</p>
      </header>

      <div className="tabs-header" style={{ borderRadius: '8px', overflow: 'hidden' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, textAlign: 'center' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main style={{ minHeight: '600px', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        {renderTabContent()}
      </main>

      <footer style={{ marginTop: '50px', padding: '30px', background: '#333', color: '#fff', borderRadius: '15px 15px 0 0', textAlign: 'center' }}>
        <h4 style={{ color: 'var(--primary-orange)' }}>Công ty TNHH TM DV Thực Phẩm Tân Nam Vang</h4>
        <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>Địa chỉ: Lô 16/18 Hưng Phú, Phường Chánh Hưng, Tp HCM</p>
        <p style={{ fontSize: '14px', opacity: 0.8 }}>MST: 0317426213 | SĐT: 0965551315</p>
        <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.5 }}>&copy; 2026 Admin Panel. Designed with excellence.</p>
      </footer>
    </div>
  );
}

export default App;
