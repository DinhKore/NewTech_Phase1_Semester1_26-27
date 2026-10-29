import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { useEffect } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Quản lý tài liệu', icon: '📄' },
  { to: '/chat', label: 'Trợ lý học tập AI', icon: '🤖' },
  { to: '/quiz', label: 'Ôn tập trắc nghiệm', icon: '📝' },
  { to: '/admin', label: 'Bảng quản trị', icon: '📊', adminOnly: true },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Quản lý tài liệu',
  '/chat': 'Trợ lý học tập AI',
  '/quiz': 'Ôn tập trắc nghiệm',
  '/admin': 'Bảng quản trị',
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const isAdmin = user?.role === 'admin';
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>🎓</span>
          <span>Course Assistant</span>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {user?.avatarUrl ? (
              <img className="avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <div className="avatar">{user?.name.charAt(0).toUpperCase() ?? 'U'}</div>
            )}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className={`sidebar-user-role ${isAdmin ? 'admin' : ''}`}>
                {isAdmin ? '🛡️ Quản trị viên' : '🎓 Sinh viên'}
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-logout" onClick={logout}>
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button type="button" className="menu-button" aria-label="Mở menu" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
          <span className="topbar-title">{PAGE_TITLES[location.pathname] ?? 'Course Assistant'}</span>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
