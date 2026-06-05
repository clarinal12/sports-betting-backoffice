'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { Bet } from '@/lib/types';
import { ui } from '@/lib/ui';

const STATUSES = ['', 'ACCEPTED', 'WON', 'LOST', 'VOID', 'REJECTED'];

export default function BetsPage() {
  const { api } = useAuth();
  const { groupId } = useTenant();
  const searchParams = useSearchParams();
  const handleError = useApiErrorHandler();
  const [bets, setBets] = useState<Bet[]>([]);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [eventId, setEventId] = useState(searchParams.get('eventId') ?? '');
  const [error, setError] = useState<string | null>(null);

  async function load(filters?: {
    userId?: string;
    status?: string;
    eventId?: string;
  }) {
    if (!api || !groupId) return;
    setError(null);
    try {
      setBets(
        await api.searchBets(groupId, {
          userId: filters?.userId,
          status: filters?.status,
          eventId: filters?.eventId,
          limit: 50,
        }),
      );
    } catch (err) {
      setError(await handleError(err));
    }
  }

  useEffect(() => {
    void load({
      status: searchParams.get('status') ?? undefined,
      eventId: searchParams.get('eventId') ?? undefined,
    });
  }, [api, groupId, searchParams]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    void load({
      userId: userId.trim() || undefined,
      status: status || undefined,
      eventId: eventId.trim() || undefined,
    });
  }

  return (
    <PermissionGate permission="bets.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Bet monitor</h1>
          <p className={ui.muted}>Search recent bets for the tenant.</p>
        </header>
        <TenantRequired>
          <form
            className={`${ui.card} mb-4 flex flex-wrap items-end gap-4`}
            onSubmit={onFilter}
          >
            <label className="grid gap-1">
              <span className={ui.label}>User ID</span>
              <input className={ui.input} value={userId} onChange={(e) => setUserId(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className={ui.label}>Status</span>
              <select className={ui.input} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((value) => (
                  <option key={value || 'all'} value={value}>
                    {value || 'All'}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className={ui.label}>Event ID</span>
              <input
                className={ui.input}
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Optional"
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
                  <th className={ui.th}>Bet</th>
                  <th className={ui.th}>User</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Stake</th>
                  <th className={ui.th}>Potential</th>
                  <th className={ui.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={bet.id}>
                    <td className={ui.td}>
                      <Link href={`/bets/${bet.id}`} className="text-violet-400">
                        <code className="text-xs">{bet.id.slice(0, 10)}…</code>
                      </Link>
                    </td>
                    <td className={ui.td}>
                      <code className="text-xs">{bet.userId?.slice(0, 12)}…</code>
                    </td>
                    <td className={ui.td}>
                      <span className={ui.badge}>{bet.status}</span>
                    </td>
                    <td className={ui.td}>
                      {bet.stake} {bet.currency}
                    </td>
                    <td className={ui.td}>{bet.potentialPayout}</td>
                    <td className={ui.td}>
                      {new Date(bet.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bets.length === 0 ? (
              <p className={`${ui.muted} mt-3`}>No bets match filters.</p>
            ) : null}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
