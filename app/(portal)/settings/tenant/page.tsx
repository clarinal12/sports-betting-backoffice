'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { Tenant } from '@/lib/types';
import { SettingsNav } from '@/components/settings-nav';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function SettingsTenantPage() {
  const { api, staff } = useAuth();
  const { groupId, tenant, refreshTenant } = useTenant();
  const handleError = useApiErrorHandler();
  const [form, setForm] = useState<Partial<Tenant>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canUpdate = hasPermission(staff?.permissions ?? [], 'tenant.update');

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name,
        defaultCurrency: tenant.defaultCurrency,
        timezone: tenant.timezone,
        status: tenant.status,
      });
    }
  }, [tenant]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!api || !groupId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patchTenant(groupId, {
        name: form.name,
        defaultCurrency: form.defaultCurrency,
        timezone: form.timezone,
        status: form.status,
      });
      await refreshTenant();
      setMessage('Tenant updated.');
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PermissionGate permission="tenant.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Tenant & brand</h1>
          <p className={ui.muted}>Casino group settings for the selected tenant.</p>
        </header>
        <SettingsNav active="tenant" />
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-zinc-400">{message}</p> : null}
          {tenant ? (
            <form className={`${ui.card} grid max-w-xl gap-4`} onSubmit={onSave}>
              <p className={ui.muted}>
                <code>{tenant.id}</code> · slug {tenant.slug} · merchant{' '}
                {tenant.merchantId}
              </p>
              <label className="grid gap-1">
                <span className={ui.label}>Name</span>
                <input
                  className={ui.input}
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!canUpdate}
                />
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>Default currency</span>
                <input
                  className={ui.input}
                  value={form.defaultCurrency ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultCurrency: e.target.value }))
                  }
                  disabled={!canUpdate}
                />
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>Timezone</span>
                <input
                  className={ui.input}
                  value={form.timezone ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timezone: e.target.value }))
                  }
                  disabled={!canUpdate}
                />
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>Status</span>
                <input
                  className={ui.input}
                  value={form.status ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  disabled={!canUpdate}
                />
              </label>
              {canUpdate ? (
                <button type="submit" className={`${ui.btn} w-fit`} disabled={saving}>
                  {saving ? 'Saving…' : 'Save tenant'}
                </button>
              ) : (
                <p className={ui.muted}>Read-only (missing tenant.update).</p>
              )}
            </form>
          ) : (
            <p className={ui.muted}>Loading tenant…</p>
          )}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
