'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { SettlementSubnav } from '@/components/settlement-subnav';
import { StatCard } from '@/components/stat-card';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import { hasPermission } from '@/lib/permissions';
import type { WalletSettlementQueue } from '@/lib/types';
import { ui } from '@/lib/ui';

const POLL_MS = 30_000;

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

export default function WalletSettlementQueuePage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [data, setData] = useState<WalletSettlementQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const canTransmit = hasPermission(staff?.permissions ?? [], 'settlement.run');

  const load = useCallback(async () => {
    if (!api || !groupId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.listWalletSettlementQueue(groupId);
      setData(result);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
    }
  }, [api, groupId, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!api || !groupId) return;
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [api, groupId, load]);

  async function onRetryTransmission() {
    if (!api || !groupId || !canTransmit) return;
    setTransmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.retryWalletSettlementTransmission(groupId);
      if (result.pendingBefore === 0) {
        setMessage('Nothing pending — wallet queue is already clear.');
      } else if (result.pendingAfter === 0) {
        setMessage(
          `Transmitted ${result.batchesSent} batch(es). All pending settlements delivered.`,
        );
      } else {
        setMessage(
          `Transmitted ${result.batchesSent} batch(es). ${result.pendingAfter} bet(s) still pending — check last error below.`,
        );
      }
      await load();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setTransmitting(false);
    }
  }

  return (
    <PermissionGate permission="settlement.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Wallet transmission</h1>
          <p className={ui.muted}>
            Settled bets waiting for merchant wallet batch delivery. The sports
            book has graded these wagers; wallet credits or debits are still in
            the outbox.
          </p>
        </header>

        <SettlementSubnav />

        <TenantRequired>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {canTransmit ? (
              <button
                type="button"
                className={ui.btn}
                disabled={transmitting || loading || !data?.summary.pendingCount}
                onClick={() => void onRetryTransmission()}
              >
                {transmitting ? 'Transmitting…' : 'Transmit to wallet now'}
              </button>
            ) : null}
            <button
              type="button"
              className={ui.btnGhost}
              disabled={loading || transmitting}
              onClick={() => void load()}
            >
              {loading ? 'Refreshing…' : 'Refresh now'}
            </button>
            {lastRefreshed ? (
              <span className="text-xs text-zinc-500">
                Last updated {lastRefreshed.toLocaleTimeString()} · auto-refresh
                every 30s
              </span>
            ) : null}
          </div>

          {message ? <p className="mb-4 text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

          {data ? (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Pending wallet sync"
                  value={data.summary.pendingCount}
                  hint="Settled in DB, not yet confirmed by wallet"
                />
                <StatCard
                  label="Open batches"
                  value={data.summary.batchCount}
                  hint="Distinct batch IDs in the outbox"
                />
                <StatCard
                  label="Retrying"
                  value={data.summary.retryingCount}
                  hint="At least one failed delivery attempt"
                />
                <StatCard
                  label="Due now"
                  value={data.summary.dueNowCount}
                  hint="Eligible for the next worker poll"
                />
              </div>

              {data.batches.length > 0 ? (
                <section className={`${ui.card} mb-6`}>
                  <h2 className={ui.cardTitle}>Batches</h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className={ui.table}>
                      <thead>
                        <tr>
                          <th className={ui.th}>Batch ID</th>
                          <th className={ui.th}>Bets</th>
                          <th className={ui.th}>Oldest queued</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.batches.map((batch) => (
                          <tr key={batch.batchId ?? 'unassigned'}>
                            <td className={ui.td}>
                              {batch.batchId ? (
                                <code className="text-xs text-zinc-300">
                                  {shortId(batch.batchId)}
                                </code>
                              ) : (
                                <span className="text-amber-400">Unassigned</span>
                              )}
                            </td>
                            <td className={ui.td}>{batch.count}</td>
                            <td className={ui.td}>
                              {formatWhen(batch.oldestCreatedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <div className={`${ui.card} overflow-x-auto`}>
                <h2 className={`${ui.cardTitle} mb-3`}>
                  Pending transmissions ({data.items.length})
                </h2>
                {data.items.length === 0 ? (
                  <p className={ui.muted}>
                    No bets are waiting on wallet settlement. All graded wagers
                    have been delivered to the merchant wallet.
                  </p>
                ) : (
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        <th className={ui.th}>Bet</th>
                        <th className={ui.th}>Outcome</th>
                        <th className={ui.th}>Wallet amount</th>
                        <th className={ui.th}>Batch</th>
                        <th className={ui.th}>Attempts</th>
                        <th className={ui.th}>Next retry</th>
                        <th className={ui.th}>Last error</th>
                        <th className={ui.th}>Settled at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={item.outboxId}>
                          <td className={ui.td}>
                            <Link
                              href={`/bets/${item.betId}`}
                              className="text-violet-400"
                            >
                              {shortId(item.betId)}
                            </Link>
                            <div className="text-xs text-zinc-500">
                              {item.bet.username || item.bet.userId}
                            </div>
                          </td>
                          <td className={ui.td}>
                            <span className={ui.badge}>{item.bet.status}</span>
                            <div className="mt-1 text-xs text-zinc-500">
                              Stake {item.bet.stake} {item.bet.currency}
                              {item.bet.payoutAmount
                                ? ` · Payout ${item.bet.payoutAmount}`
                                : null}
                            </div>
                          </td>
                          <td className={ui.td}>
                            {item.walletAmount ?? '—'} {item.bet.currency}
                          </td>
                          <td className={ui.td}>
                            {item.batchId ? (
                              <code className="text-xs text-zinc-400">
                                {shortId(item.batchId)}
                              </code>
                            ) : (
                              <span className="text-xs text-amber-400">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className={ui.td}>
                            {item.attempts}
                            {item.retryDue ? (
                              <div className="text-xs text-emerald-400">
                                Due now
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-500">
                                Waiting
                              </div>
                            )}
                          </td>
                          <td className={ui.td}>
                            {formatWhen(item.nextRetryAt)}
                          </td>
                          <td className={ui.td}>
                            {item.lastError ? (
                              <span className="text-xs text-red-300">
                                {item.lastError}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500">
                                First attempt pending
                              </span>
                            )}
                          </td>
                          <td className={ui.td}>
                            {formatWhen(item.bet.settledAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <p className={ui.muted}>Loading wallet queue…</p>
          )}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
