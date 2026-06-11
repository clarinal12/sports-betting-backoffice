'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { TradingSubnav } from '@/components/trading-subnav';
import { useTenant } from '@/components/tenant-context';
import {
  SUSPEND_REASON_CODES,
  formatSuspendReason,
} from '@/lib/trading-reasons';
import { hasPermission } from '@/lib/permissions';
import type { TradableMarket } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function TradingMarketsPage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [markets, setMarkets] = useState<TradableMarket[]>([]);
  const [reasonCode, setReasonCode] = useState<string>(SUSPEND_REASON_CODES[0].code);
  const [reasonNote, setReasonNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canSuspend = hasPermission(staff?.permissions ?? [], 'trading.suspend');

  const loadMarkets = useCallback(async () => {
    if (!api || !groupId) return;
    setError(null);
    try {
      setMarkets(await api.getTradableMarkets(groupId));
    } catch (err) {
      setError(await handleError(err));
    }
  }, [api, groupId, handleError]);

  useEffect(() => {
    void loadMarkets();
  }, [loadMarkets]);

  async function suspendMarket(market: TradableMarket) {
    if (!api || !groupId || !canSuspend) return;
    const reason = formatSuspendReason(reasonCode, reasonNote);
    if (
      !window.confirm(
        `Suspend ${market.matchup} (${market.marketType})?\nReason: ${reason}`,
      )
    ) {
      return;
    }
    setBusyId(market.marketId);
    setMessage(null);
    setError(null);
    try {
      await api.suspendMarket(groupId, market.marketId, reason);
      setMessage(`Market suspended for ${market.matchup}.`);
      await loadMarkets();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function resumeMarket(market: TradableMarket) {
    if (!api || !groupId || !canSuspend) return;
    if (!window.confirm(`Resume market for ${market.matchup}?`)) {
      return;
    }
    setBusyId(market.marketId);
    setMessage(null);
    setError(null);
    try {
      await api.resumeMarket(groupId, market.marketId);
      setMessage(`Market resumed for ${market.matchup}.`);
      await loadMarkets();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PermissionGate permission="trading.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Live markets</h1>
          <p className={ui.muted}>
            Suspend or resume tradable markets for the selected merchant.
          </p>
        </header>
        <TradingSubnav />
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-emerald-400">{message}</p> : null}

          {canSuspend ? (
            <div className={`${ui.card} mb-4 grid gap-4 sm:grid-cols-2`}>
              <label className="grid gap-1">
                <span className={ui.label}>Suspend reason</span>
                <select
                  className={ui.select}
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                >
                  {SUSPEND_REASON_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>Note (optional)</span>
                <input
                  className={ui.input}
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Trader context for audit"
                />
              </label>
            </div>
          ) : null}

          <div className={`${ui.card} overflow-x-auto`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Matchup</th>
                  <th className={ui.th}>Market</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market) => {
                  const busy = busyId === market.marketId;
                  return (
                    <tr key={market.marketId}>
                      <td className={ui.td}>
                        {market.matchup}
                        <div className="text-xs text-zinc-500">
                          {market.providerRef}
                        </div>
                      </td>
                      <td className={ui.td}>
                        {market.marketType}
                        {market.marketLine ? ` ${market.marketLine}` : ''}
                      </td>
                      <td className={ui.td}>
                        <span className={ui.badge}>{market.marketStatus}</span>
                        <div className="mt-1 text-xs text-zinc-500">
                          Event {market.eventStatus}
                        </div>
                      </td>
                      <td className={ui.td}>
                        {canSuspend ? (
                          <div className="flex flex-wrap gap-2">
                            {market.marketStatus !== 'SUSPENDED' ? (
                              <button
                                type="button"
                                className={ui.btnDanger}
                                disabled={busy}
                                onClick={() => void suspendMarket(market)}
                              >
                                {busy ? '…' : 'Suspend'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={ui.btn}
                                disabled={busy}
                                onClick={() => void resumeMarket(market)}
                              >
                                {busy ? '…' : 'Resume'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">Read-only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {markets.length === 0 ? (
              <p className={`${ui.muted} mt-3`}>No open markets for this merchant.</p>
            ) : null}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
