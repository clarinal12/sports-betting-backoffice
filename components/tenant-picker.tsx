'use client';

import { useTenant } from './tenant-context';
import { ui } from '@/lib/ui';

export function TenantPicker({
  variant = 'inline',
}: {
  variant?: 'inline' | 'sidebar';
}) {
  const {
    groupId,
    tenant,
    accessibleTenants,
    isPlatformStaff,
    setGroupId,
    loading,
    error,
  } = useTenant();

  const sidebar = variant === 'sidebar';

  if (!isPlatformStaff) {
    return (
      <p className={`${sidebar ? 'text-sm' : 'text-xs'} text-zinc-400`}>
        {tenant?.name ?? 'Tenant'}
        {tenant?.slug ? (
          <span className="block text-xs text-zinc-500">{tenant.slug}</span>
        ) : null}
      </p>
    );
  }

  if (accessibleTenants.length === 0) {
    return (
      <p className={`${sidebar ? 'text-sm' : 'text-xs'} text-amber-400`}>
        No tenants assigned
      </p>
    );
  }

  return (
    <div className={sidebar ? 'space-y-1' : 'flex items-center gap-2'}>
      <select
        className={sidebar ? `${ui.select} w-full text-sm` : `${ui.select} !w-auto min-w-44`}
        value={groupId ?? ''}
        onChange={(e) => setGroupId(e.target.value)}
        aria-label="Select tenant"
      >
        <option value="">Select tenant…</option>
        {accessibleTenants.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.slug})
          </option>
        ))}
      </select>
      {!sidebar && tenant ? (
        <span className="text-xs text-zinc-400">{tenant.slug}</span>
      ) : null}
      {loading ? (
        <span className="text-xs text-zinc-500">Loading…</span>
      ) : error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : sidebar && tenant ? (
        <span className="text-xs text-zinc-500">{tenant.slug}</span>
      ) : null}
    </div>
  );
}
