'use client';

import { hasPermission } from '@/lib/permissions';
import { useAuth } from './auth-provider';

export function PermissionGate({
  permission,
  children,
  fallback = (
    <p className="text-sm text-zinc-400">
      You do not have permission to view this section.
    </p>
  ),
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { staff } = useAuth();
  if (!staff || !hasPermission(staff.permissions, permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
