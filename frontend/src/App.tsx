// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DocumentManager from './pages/DocumentManager';
import AIChatAssistant from './pages/AIChatAssistant';

export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f1f5f9' }}>
        {/* Lắp component Sidebar vào */}
        <Sidebar />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <header style={{ height: '60px', background: 'white', display: 'flex', alignItems: 'center', padding: '0 30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: 0, color: '#334155' }}>Dự án NewTech - Nhóm Đính</h3>
          </header>

          <div style={{ padding: '30px', overflowY: 'auto' }}>
            {/* Bộ định tuyến (Router) gọi các Pages */}
            <Routes>
              <Route path="/" element={<DocumentManager />} />
              <Route path="/chat" element={<AIChatAssistant />} />
              <Route path="*" element={<h2 style={{ color: 'red' }}>404 - Không tìm thấy trang</h2>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}