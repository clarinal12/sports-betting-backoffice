'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { BetExceptionQueue } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function BetExceptionsPage() {
  const { api } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [data, setData] = useState<BetExceptionQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !groupId) return;
    let cancelled = false;
    void api
      .listBetExceptions(groupId)
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
    <PermissionGate permission="bets.read">
      <div className={ui.page}>
        <Link href="/bets" className="text-sm text-zinc-400">
          ← Bet monitor
        </Link>
        <header className="mb-6 mt-2">
          <h1 className="text-3xl font-semibold">Exception queue</h1>
          <p className={ui.muted}>
            Pending placements, wallet sync failures, and settlement flags.
          </p>
        </header>
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {data ? (
            <div className="grid gap-4">
              <section className={ui.card}>
                <h2 className={ui.cardTitle}>Wallet failures ({data.walletFailures.length})</h2>
                {data.walletFailures.length === 0 ? (
                  <p className={`${ui.muted} mt-2`}>None</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.walletFailures.map((row) => (
                      <li key={row.outboxId} className="rounded-lg border border-zinc-800 p-3">
                        <Link href={`/bets/${row.betId}`} className="text-violet-400">
                          {row.betId.slice(0, 12)}…
                        </Link>
                        <span className="ml-2 text-zinc-500">{row.outboxStatus}</span>
                        <p className="mt-1 text-xs text-red-300">{row.lastError ?? '—'}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={ui.card}>
                <h2 className={ui.cardTitle}>
                  Pending placement ({data.pendingPlacement.length})
                </h2>
                {data.pendingPlacement.length === 0 ? (
                  <p className={`${ui.muted} mt-2`}>None</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.pendingPlacement.map((bet) => (
                      <li key={bet.id}>
                        <Link href={`/bets/${bet.id}`} className="text-violet-400">
                          {bet.id.slice(0, 12)}…
                        </Link>
                        {' · '}
                        {bet.stake} {bet.currency}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={ui.card}>
                <h2 className={ui.cardTitle}>
                  Settlement flags ({data.settlementFlags.length})
                </h2>
                {data.settlementFlags.length === 0 ? (
                  <p className={`${ui.muted} mt-2`}>None</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.settlementFlags.map((bet) => (
                      <li key={bet.id}>
                        <Link href={`/bets/${bet.id}`} className="text-violet-400">
                          {bet.id.slice(0, 12)}…
                        </Link>
                        <p className="text-xs text-amber-300">{bet.settlementNote}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <p className={ui.muted}>Loading…</p>
          )}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
