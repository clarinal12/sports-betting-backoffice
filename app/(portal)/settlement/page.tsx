'use client';

import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { UnsettledEvent } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function SettlementPage() {
  const { api } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [events, setEvents] = useState<UnsettledEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !groupId) return;
    let cancelled = false;
    void api
      .listUnsettledEvents(groupId)
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch(async (err) => {
        if (!cancelled) setError(await handleError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, handleError]);

  return (
    <PermissionGate permission="settlement.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Settlement queue</h1>
          <p className={ui.muted}>
            Events with open bets that still need results or settlement.
          </p>
        </header>
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          <div className={`${ui.card} overflow-x-auto`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Matchup</th>
                  <th className={ui.th}>Score</th>
                  <th className={ui.th}>Event status</th>
                  <th className={ui.th}>Market</th>
                  <th className={ui.th}>Ready</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.eventId}>
                    <td className={ui.td}>
                      {event.matchup}
                      <div className="text-xs text-zinc-500">{event.providerRef}</div>
                    </td>
                    <td className={ui.td}>
                      {event.homeScore ?? '—'} – {event.awayScore ?? '—'}
                    </td>
                    <td className={ui.td}>
                      <span className={ui.badge}>{event.eventStatus}</span>
                    </td>
                    <td className={ui.td}>{event.marketStatus ?? '—'}</td>
                    <td className={ui.td}>
                      <span
                        className={
                          event.readyToSettle
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {event.readyToSettle ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 ? (
              <p className={`${ui.muted} mt-3`}>No unsettled events with open bets.</p>
            ) : null}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
