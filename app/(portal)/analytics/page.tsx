'use client';

import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { StatCard } from '@/components/stat-card';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { AnalyticsSummary, DailyGgrReport } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function AnalyticsPage() {
  const { api } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [daily, setDaily] = useState<DailyGgrReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !groupId) return;
    let cancelled = false;
    void Promise.all([
      api.getAnalyticsSummary(groupId),
      api.getDailyGgr(groupId, 7),
    ])
      .then(([summary, rollup]) => {
        if (!cancelled) {
          setData(summary);
          setDaily(rollup);
        }
      })
      .catch(async (err) => {
        if (!cancelled) setError(await handleError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, handleError]);

  return (
    <PermissionGate permission="analytics.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Performance</h1>
          <p className={ui.muted}>Bet aggregates and daily GGR by sport.</p>
        </header>
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {data ? (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Open liability"
                  value={data.openLiability.betCount}
                  hint={data.openLiability.stake}
                />
                <StatCard label="GGR (all time)" value={data.ggr.gross} />
                <StatCard label="Settled stake" value={data.ggr.settledStake} />
                <StatCard label="Payouts" value={data.ggr.payouts} />
              </div>
              <div className={`${ui.card} mb-4 overflow-x-auto`}>
                <h2 className={ui.cardTitle}>Daily GGR by sport (last 7 days)</h2>
                <table className={`${ui.table} mt-3`}>
                  <thead>
                    <tr>
                      <th className={ui.th}>Date</th>
                      <th className={ui.th}>Sport</th>
                      <th className={ui.th}>Bets</th>
                      <th className={ui.th}>Stake</th>
                      <th className={ui.th}>Payouts</th>
                      <th className={ui.th}>GGR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(daily?.rows ?? []).map((row) => (
                      <tr key={`${row.date}-${row.sportSlug}`}>
                        <td className={ui.td}>{row.date}</td>
                        <td className={ui.td}>{row.sportName}</td>
                        <td className={ui.td}>{row.betCount}</td>
                        <td className={ui.td}>{row.settledStake}</td>
                        <td className={ui.td}>{row.payouts}</td>
                        <td className={ui.td}>{row.ggr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(daily?.rows.length ?? 0) === 0 ? (
                  <p className={`${ui.muted} mt-3`}>
                    No settled bets in the selected window.
                  </p>
                ) : null}
              </div>
              <div className={`${ui.card} overflow-x-auto`}>
                <h2 className={ui.cardTitle}>By status</h2>
                <table className={`${ui.table} mt-3`}>
                  <thead>
                    <tr>
                      <th className={ui.th}>Status</th>
                      <th className={ui.th}>Count</th>
                      <th className={ui.th}>Stake</th>
                      <th className={ui.th}>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.byStatus).map(([status, row]) => (
                      <tr key={status}>
                        <td className={ui.td}>{status}</td>
                        <td className={ui.td}>{row.count}</td>
                        <td className={ui.td}>{row.stake}</td>
                        <td className={ui.td}>{row.payout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className={ui.muted}>Loading…</p>
          )}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
