'use client';

import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { TradingSubnav } from '@/components/trading-subnav';
import { useTenant } from '@/components/tenant-context';
import type { ExposureSummary } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function TradingExposurePage() {
  const { api } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [data, setData] = useState<ExposureSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !groupId) return;
    let cancelled = false;
    void api
      .getExposure(groupId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(async (err) => {
        if (!cancelled) setError(await handleError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, handleError]);

  return (
    <PermissionGate permission="trading.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Exposure & liability</h1>
          <p className={ui.muted}>Open ACCEPTED bets aggregated by event.</p>
        </header>
        <TradingSubnav />
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          <div className={ui.card}>
            {data ? (
              <>
                <p className={ui.muted}>
                  {data.openBetCount} open bets · stake {data.totalStake} ·
                  potential {data.totalPotentialPayout} {data.currency ?? ''}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        <th className={ui.th}>Event ID</th>
                        <th className={ui.th}>Leg refs</th>
                        <th className={ui.th}>Stake</th>
                        <th className={ui.th}>Potential payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byEvent.map((row) => (
                        <tr key={row.eventId}>
                          <td className={ui.td}>
                            <code className="text-xs">{row.eventId}</code>
                          </td>
                          <td className={ui.td}>{row.legCount}</td>
                          <td className={ui.td}>{row.stake}</td>
                          <td className={ui.td}>{row.potentialPayout}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.byEvent.length === 0 ? (
                  <p className={`${ui.muted} mt-3`}>No open exposure.</p>
                ) : null}
              </>
            ) : (
              <p className={ui.muted}>Loading…</p>
            )}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
