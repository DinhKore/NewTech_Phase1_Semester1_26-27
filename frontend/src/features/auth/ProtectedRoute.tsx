import { Navigate, Outlet } from 'react-router-dom';
import { LoadingBlock } from '../../shared/components/LoadingBlock';
import { useAuth } from './useAuth';

/** Renders child routes only for signed-in users; everyone else is sent to /login. */
export function ProtectedRoute() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingBlock label="Đang kiểm tra phiên đăng nhập..." />;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <Outlet />;
}
