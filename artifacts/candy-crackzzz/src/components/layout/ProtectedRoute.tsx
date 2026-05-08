import { ReactNode } from 'react';
import { Link, Redirect } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { AdminRole } from '@/types';
import { Permission, roleLabels, userHasAnyPermission, userHasPermission } from '@/lib/permissions';
import { FullScreenLoader } from '@/components/layout/AppStatusOverlays';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AdminRole[];
  requirePermission?: Permission;
  requireAnyPermission?: Permission[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requirePermission,
  requireAnyPermission,
}: ProtectedRouteProps) {
  const { isLoaded, isLoggedIn, currentUser, hasRole } = useAuth();

  if (!isLoaded) {
    return <FullScreenLoader message="Checking your session…" />;
  }

  if (!isLoggedIn || !currentUser) {
    return <Redirect to="/admin/login" />;
  }

  const roleAllowed = !allowedRoles || hasRole(allowedRoles);
  const singlePermAllowed = !requirePermission || userHasPermission(currentUser, requirePermission);
  const anyPermAllowed = !requireAnyPermission || userHasAnyPermission(currentUser, requireAnyPermission);

  if (!roleAllowed || !singlePermAllowed || !anyPermAllowed) {
    return <AccessDenied roleLabel={roleLabels[currentUser.role]} username={currentUser.username} />;
  }

  return <>{children}</>;
}

function AccessDenied({ roleLabel, username }: { roleLabel: string; username: string }) {
  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border-2 border-pink-200 p-8 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🚫</div>
        <h1 className="text-2xl font-bold text-pink-600 mb-2">No access here</h1>
        <p className="text-gray-700 mb-2">
          You do not have permission to access this area.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Signed in as <span className="font-semibold">{username}</span> · {roleLabel}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/admin"
            className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition"
            data-testid="link-back-to-admin"
          >
            Back to Admin Dashboard
          </Link>
          <Link
            href="/"
            className="inline-block text-pink-600 hover:text-pink-700 font-medium py-2 px-4 rounded-lg transition"
            data-testid="link-to-storefront"
          >
            Go to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
