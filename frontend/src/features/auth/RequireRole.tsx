import { Link, Outlet } from 'react-router-dom';
import { EmptyState } from '../../shared/components/EmptyState';
import type { UserRole } from './auth.types';
import { useAuth } from './useAuth';

interface RequireRoleProps {
  roles: UserRole[];
}

/**
 * UI-level guard (hides screens the user may not use). The real enforcement
 * is on the server: those endpoints answer HTTP 403 regardless of this component.
 */
export function RequireRole({ roles }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return (
      <EmptyState icon="⛔" title="403 - Không có quyền truy cập">
        <p style={{ marginBottom: 16 }}>Trang này chỉ dành cho tài khoản có quyền quản trị viên.</p>
        <Link to="/" className="btn btn-primary">
          Về trang tài liệu
        </Link>
      </EmptyState>
    );
  }
  return <Outlet />;
}
