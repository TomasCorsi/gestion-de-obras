import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'capataz' | 'maquinista' | 'ayudante';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading, hasRole, role } = useAuth();
  const location = useLocation();

  // Wait for both auth and role to load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require roles but role hasn't loaded yet, show loading
  if (requiredRoles && requiredRoles.length > 0 && role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(r => hasRole(r));
    if (!hasRequiredRole) {
      return <Navigate to="/sin-acceso" replace />;
    }
  }

  return <>{children}</>;
}
