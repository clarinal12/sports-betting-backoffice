'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { TenantPicker } from './tenant-picker';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

type NavItem = {
  href: string;
  label: string;
  permission?: string;
  match?: string;
  platformOnly?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  {
    href: '/trading/exposure',
    label: 'Trading',
    permission: 'trading.read',
    match: '/trading',
  },
  {
    href: '/product/leagues',
    label: 'Product',
    permission: 'product.leagues.read',
    match: '/product',
  },
  { href: '/bets', label: 'Bets', permission: 'bets.read', match: '/bets' },
  {
    href: '/settlement',
    label: 'Settlement',
    permission: 'settlement.read',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    permission: 'analytics.read',
  },
  {
    href: '/compliance/audit',
    label: 'Compliance',
    permission: 'compliance.audit.read',
    match: '/compliance',
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    href: '/settings/tenant',
    label: 'Tenant settings',
    permission: 'tenant.read',
    match: '/settings/tenant',
  },
  {
    href: '/settings/merchants',
    label: 'Onboarding',
    permission: 'tenant.create',
    match: '/settings/merchants',
    platformOnly: true,
  },
  {
    href: '/settings/operators',
    label: 'Operator accounts',
    permission: 'staff.operator.read',
    match: '/settings/operators',
    platformOnly: true,
  },
  {
    href: '/settings/platform-access',
    label: 'Platform access',
    permission: 'staff.tenant_access.read',
    match: '/settings/platform-access',
    platformOnly: true,
  },
];

function filterNav(items: NavItem[], staff: NonNullable<ReturnType<typeof useAuth>['staff']>, isPlatformStaff: boolean) {
  return items.filter((item) => {
    if (item.platformOnly && !isPlatformStaff) {
      return false;
    }
    return (
      !item.permission || hasPermission(staff.permissions, item.permission)
    );
  });
}

function isActive(pathname: string, item: NavItem) {
  if (item.match) {
    return pathname === item.match || pathname.startsWith(`${item.match}/`);
  }
  return pathname === item.href;
}

function SidebarNav({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={active ? ui.sidebarNavLinkActive : ui.sidebarNavLink}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { staff, logout, isReady } = useAuth();

  if (!isReady || !staff) {
    return null;
  }

  const isPlatformStaff = staff.casinoGroupId == null;
  const mainNav = filterNav(MAIN_NAV, staff, isPlatformStaff);
  const adminNav = filterNav(ADMIN_NAV, staff, isPlatformStaff);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-4 py-5">
          <Link href="/" className="block font-semibold tracking-tight text-zinc-100">
            Back Office
          </Link>
          <p className="mt-1 text-xs text-zinc-500">Sports betting ops</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav items={mainNav} pathname={pathname} />

          {adminNav.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Administration
              </p>
              <SidebarNav items={adminNav} pathname={pathname} />
            </div>
          ) : null}
        </nav>

        <div className="space-y-3 border-t border-zinc-800 px-4 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Tenant
            </p>
            <TenantPicker variant="sidebar" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-zinc-200">{staff.email}</p>
            <p className="truncate text-xs text-zinc-500">
              {staff.roles.join(', ')}
            </p>
          </div>
          <button
            type="button"
            className={`${ui.btnGhost} w-full`}
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
