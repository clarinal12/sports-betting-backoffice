'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { useTenant } from '@/components/tenant-context';
import type { PlatformAdminRow, TenantListItem } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function PlatformAccessPage() {
  const { api, staff } = useAuth();
  const { refreshTenants } = useTenant();
  const handleError = useApiErrorHandler();
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([]);
  const [allTenants, setAllTenants] = useState<TenantListItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;

    async function load() {
      if (!api) {
        return;
      }
      setError(null);
      try {
        const [platformAdmins, tenants] = await Promise.all([
          api.listPlatformAdmins(),
          api.listTenants(),
        ]);
        if (!cancelled) {
          setAdmins(platformAdmins);
          setAllTenants(tenants);
          setDrafts(
            Object.fromEntries(
              platformAdmins.map((row) => [
                row.id,
                row.casinoGroups.map((g) => g.id),
              ]),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(await handleError(err));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, handleError]);

  async function save(adminId: string) {
    if (!api) return;
    setSavingId(adminId);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.setPlatformAdminTenantAccess(
        adminId,
        drafts[adminId] ?? [],
      );
      setAdmins((rows) =>
        rows.map((row) => (row.id === adminId ? { ...row, ...updated } : row)),
      );
      setMessage(`Updated access for ${updated.email}.`);
      await refreshTenants();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setSavingId(null);
    }
  }

  function toggleTenant(adminId: string, tenantId: string) {
    setDrafts((current) => {
      const selected = new Set(current[adminId] ?? []);
      if (selected.has(tenantId)) {
        selected.delete(tenantId);
      } else {
        selected.add(tenantId);
      }
      return { ...current, [adminId]: [...selected] };
    });
  }

  return (
    <PermissionGate permission="staff.tenant_access.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Platform admin access</h1>
          <p className={ui.muted}>
            Assign which merchant accounts each PLATFORM_ADMIN may access.
          </p>
        </header>
        <nav className="mb-6 flex flex-wrap gap-2">
          {hasPermission(staff?.permissions ?? [], 'tenant.read') ? (
            <Link href="/settings/tenant" className={ui.navLink}>
              Tenant
            </Link>
          ) : null}
          {hasPermission(staff?.permissions ?? [], 'tenant.create') ? (
            <Link href="/settings/merchants" className={ui.navLink}>
              Merchants
            </Link>
          ) : null}
          <Link href="/settings/platform-access" className={ui.navLinkActive}>
            Platform access
          </Link>
        </nav>

        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
        {message ? <p className="mb-4 text-sm text-zinc-400">{message}</p> : null}

        <div className="grid gap-4">
          {admins.map((admin) => (
            <div key={admin.id} className={ui.card}>
              <h2 className={ui.cardTitle}>{admin.email}</h2>
              <p className={`${ui.muted} mb-4`}>{admin.roles.join(', ')}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allTenants.map((tenant) => {
                  const checked = (drafts[admin.id] ?? []).includes(tenant.id);
                  return (
                    <label
                      key={tenant.id}
                      className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTenant(admin.id, tenant.id)}
                      />
                      <span>
                        {tenant.name}{' '}
                        <span className="text-zinc-500">({tenant.slug})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {hasPermission(staff?.permissions ?? [], 'staff.tenant_access.update') ? (
                <button
                  type="button"
                  className={`${ui.btn} mt-4`}
                  disabled={savingId === admin.id}
                  onClick={() => void save(admin.id)}
                >
                  {savingId === admin.id ? 'Saving…' : 'Save access'}
                </button>
              ) : null}
            </div>
          ))}
          {admins.length === 0 ? (
            <p className={ui.muted}>No PLATFORM_ADMIN users found.</p>
          ) : null}
        </div>
      </div>
    </PermissionGate>
  );
}
