'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { hasPermission } from '@/lib/permissions';
import { isPlatformStaff } from '@/lib/staff-roles';
import { ui } from '@/lib/ui';

type SettingsNavProps = {
  active: 'tenant' | 'merchants' | 'operators' | 'platform-access';
};

export function SettingsNav({ active }: SettingsNavProps) {
  const { staff } = useAuth();
  const permissions = staff?.permissions ?? [];
  const platformStaff = isPlatformStaff(staff);

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {hasPermission(permissions, 'tenant.read') ? (
        <Link
          href="/settings/tenant"
          className={active === 'tenant' ? ui.navLinkActive : ui.navLink}
        >
          Tenant
        </Link>
      ) : null}
      {hasPermission(permissions, 'tenant.create') ? (
        <Link
          href="/settings/merchants"
          className={active === 'merchants' ? ui.navLinkActive : ui.navLink}
        >
          Merchants
        </Link>
      ) : null}
      {hasPermission(permissions, 'staff.operator.read') ? (
        <Link
          href="/settings/operators"
          className={active === 'operators' ? ui.navLinkActive : ui.navLink}
        >
          {platformStaff ? 'Operator accounts' : 'Account'}
        </Link>
      ) : null}
      {platformStaff && hasPermission(permissions, 'staff.tenant_access.read') ? (
        <Link
          href="/settings/platform-access"
          className={
            active === 'platform-access' ? ui.navLinkActive : ui.navLink
          }
        >
          Platform access
        </Link>
      ) : null}
    </nav>
  );
}
