'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { AuditEntry } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function AuditPage() {
  const { api } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(filterAction?: string) {
    if (!api) return;
    setError(null);
    try {
      setEntries(
        await api.searchAudit(groupId ?? undefined, {
          action: filterAction,
          limit: 100,
        }),
      );
    } catch (err) {
      setError(await handleError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [api, groupId]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    void load(action.trim() || undefined);
  }

  return (
    <PermissionGate permission="compliance.audit.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Audit log</h1>
          <p className={ui.muted}>Search append-only audit entries.</p>
        </header>
        <TenantRequired>
          <form
            className={`${ui.card} mb-4 flex flex-wrap items-end gap-4`}
            onSubmit={onFilter}
          >
            <label className="grid gap-1">
              <span className={ui.label}>Action contains</span>
              <input
                className={ui.input}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. bets.voided"
              />
            </label>
            <button type="submit" className={ui.btn}>
              Search
            </button>
          </form>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          <div className={`${ui.card} overflow-x-auto`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>When</th>
                  <th className={ui.th}>Action</th>
                  <th className={ui.th}>Actor</th>
                  <th className={ui.th}>Entity</th>
                  <th className={ui.th}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className={ui.td}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className={ui.td}>{entry.action}</td>
                    <td className={ui.td}>
                      {entry.actorType}:{entry.actorId.slice(0, 8)}…
                    </td>
                    <td className={ui.td}>
                      {entry.entityType}:{entry.entityId.slice(0, 10)}…
                    </td>
                    <td className={ui.td}>{entry.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 ? (
              <p className={`${ui.muted} mt-3`}>No audit entries found.</p>
            ) : null}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
