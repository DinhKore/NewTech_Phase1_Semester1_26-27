// frontend/src/components/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
    user: any;
    onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
    const location = useLocation();
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    const menuItems = [
        { path: '/', label: 'Quản lý Tài Liệu', icon: '📄' },
        { path: '/chat', label: 'Trợ lý Học Tập AI', icon: '🤖' },
        { path: '/quiz', label: 'Ôn Tập Trắc Nghiệm', icon: '📝' },
        ...(isAdmin ? [{ path: '/admin', label: 'Bảng Quản Trị (Admin)', icon: '📊' }] : [])
    ];

    return (
        <aside style={{
            width: '270px',
            background: '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #1e293b',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
        }}>
            {/* Brand Header */}
            <div style={{
                padding: '24px 20px',
                fontSize: '20px',
                fontWeight: 'bold',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <span style={{ fontSize: '26px' }}>🎓</span>
                <span style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Course Assistant
                </span>
            </div>

            {/* Navigation Links */}
            <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: isActive ? '#ffffff' : '#94a3b8',
                                background: isActive ? '#1e293b' : 'transparent',
                                fontWeight: isActive ? '600' : '400',
                                fontSize: '14px',
                                position: 'relative',
                                transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) e.currentTarget.style.background = '#1e293b80';
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '15%',
                                    bottom: '15%',
                                    width: '4px',
                                    background: '#38bdf8',
                                    borderRadius: '0 4px 4px 0'
                                }} />
                            )}
                            <span style={{ fontSize: '18px' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Info & Logout Footer */}
            <div style={{
                padding: '18px 20px',
                background: '#090d16',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isAdmin ? '#0284c7' : '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}>
                        {user?.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name || 'Tài khoản'}
                        </div>
                        <div style={{ fontSize: '11px', color: isAdmin ? '#38bdf8' : '#4ade80' }}>
                            {isAdmin ? '🛡️ Quản trị viên' : '🎓 Sinh viên'}
                        </div>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    style={{
                        marginTop: '4px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        color: '#f87171',
                        border: '1px solid #ef444440',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#ef444415'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <span>🚪</span> Đăng xuất
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;