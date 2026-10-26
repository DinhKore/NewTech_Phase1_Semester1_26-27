import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const getStyle = (path: string) => ({
        display: 'block', padding: '15px 20px', color: 'white', textDecoration: 'none',
        background: location.pathname === path ? '#334155' : 'transparent',
        borderLeft: location.pathname === path ? '4px solid #3b82f6' : '4px solid transparent',
        transition: 'all 0.2s'
    });

    return (
        <aside style={{ width: '260px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', fontSize: '22px', fontWeight: 'bold', borderBottom: '1px solid #1e293b' }}>
                🎓 Course Assistant
            </div>
            <nav style={{ flex: 1, paddingTop: '10px' }}>
                <Link to="/" style={getStyle('/')}>📄 Quản lý Tài Liệu</Link>
                <Link to="/chat" style={getStyle('/chat')}>🤖 Trợ lý Học Tập AI</Link>
                {/* Nút mới thêm: Trắc nghiệm AI */}
                <Link to="/quiz" style={getStyle('/quiz')}>📝 Ôn Tập Trắc Nghiệm</Link>
            </nav>
            <div style={{ padding: '20px', fontSize: '14px', color: '#64748b', borderTop: '1px solid #1e293b' }}>
                User: Admin<br />Status: Online
            </div>
        </aside>
    );
};

export default Sidebar;