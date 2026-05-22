import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const location = useLocation();
  const hydrated = useAuthStore(s => s.hydrated);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const currentUser = useAuthStore(s => s.currentUser);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background text-text-main flex items-center justify-center">
        <div className="text-sm text-text-muted">Cargando acceso...</div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole && currentUser.rol !== requiredRole) {
    return <Navigate to="/app" replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
