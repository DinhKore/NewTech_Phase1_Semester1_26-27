// frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import DocumentManager from './pages/DocumentManager';
import AIChatAssistant from './pages/AIChatAssistant';
import QuizReview from './pages/QuizReview';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';

// Component cảnh báo 403 hiển thị trong Layout
const AccessDeniedView = () => (
  <div style={{
    padding: '60px 30px',
    background: 'white',
    borderRadius: '16px',
    textAlign: 'center',
    maxWidth: '560px',
    margin: '40px auto',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    border: '1px solid #fee2e2'
  }}>
    <div style={{ fontSize: '56px', marginBottom: '16px' }}>⛔</div>
    <h2 style={{ color: '#dc2626', margin: '0 0 10px 0', fontSize: '24px' }}>403 - Quyền Truy Cập Bị Từ Chối</h2>
    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
      Trang Bảng Quản Trị chỉ dành riêng cho tài khoản có quyền <b>Quản trị viên (Admin)</b>.
      Tài khoản Sinh viên của bạn không được cấp phép truy cập vào luồng dữ liệu này.
    </p>
    <Link
      to="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 22px',
        background: '#0284c7',
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
      }}
    >
      ⬅️ Quay lại Kho Tài Liệu
    </Link>
  </div>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  return (
    <Router>
      <Toaster position="top-right" />
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc' }}>
        <Sidebar user={user} onLogout={handleLogout} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <header style={{
            height: '64px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '17px', fontWeight: '600' }}>
              Trợ Lý Học Tập Thông Minh (Course Assistant)
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '12px',
                background: isAdmin ? '#eff6ff' : '#f0fdf4',
                color: isAdmin ? '#0284c7' : '#16a34a',
                border: `1px solid ${isAdmin ? '#bae6fd' : '#bbf7d0'}`,
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: '600'
              }}>
                {user.email} ({user.role?.toUpperCase()})
              </span>
            </div>
          </header>

          {/* Nội dung trang */}
          <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<DocumentManager />} />
              <Route path="/chat" element={<AIChatAssistant />} />
              <Route path="/quiz" element={<QuizReview />} />
              <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <AccessDeniedView />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}