'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { TradingSubnav } from '@/components/trading-subnav';
import { useTenant } from '@/components/tenant-context';
import type { RiskLimits } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function TradingLimitsPage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [limits, setLimits] = useState<RiskLimits | null>(null);
  const [minStake, setMinStake] = useState('');
  const [maxStake, setMaxStake] = useState('');
  const [maxPayout, setMaxPayout] = useState('');
  const [eventId, setEventId] = useState('');
  const [marketId, setMarketId] = useState('');
  const [reason, setReason] = useState('Risk review');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canUpdate = hasPermission(staff?.permissions ?? [], 'trading.limits.update');
  const canSuspend = hasPermission(staff?.permissions ?? [], 'trading.suspend');

  useEffect(() => {
    if (!api || !groupId) return;
    let cancelled = false;
    void api
      .getLimits(groupId)
      .then((result) => {
        if (!cancelled) {
          setLimits(result);
          setMinStake(result.minStake ?? '');
          setMaxStake(result.maxStake ?? '');
          setMaxPayout(result.maxPayout ?? '');
        }
      })
      .catch(async (err) => {
        if (!cancelled) setError(await handleError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, handleError]);

  async function onSaveLimits(event: FormEvent) {
    event.preventDefault();
    if (!api || !groupId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      setLimits(
        await api.patchLimits(groupId, {
          minStake: minStake || undefined,
          maxStake: maxStake || undefined,
          maxPayout: maxPayout || undefined,
        }),
      );
      setMessage('Limits updated.');
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(await handleError(err));
    }
  }

  return (
    <PermissionGate permission="trading.limits.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Limits & suspends</h1>
          <p className={ui.muted}>Global risk caps and manual suspend/resume.</p>
        </header>
        <TradingSubnav />
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-zinc-400">{message}</p> : null}

          <form className={`${ui.card} mb-4 grid gap-4`} onSubmit={onSaveLimits}>
            <h2 className={ui.cardTitle}>Global limits</h2>
            {(['Min stake', 'Max stake', 'Max payout'] as const).map((label, i) => {
              const values = [minStake, maxStake, maxPayout];
              const setters = [setMinStake, setMaxStake, setMaxPayout];
              return (
                <label key={label} className="grid gap-1">
                  <span className={ui.label}>{label}</span>
                  <input
                    className={ui.input}
                    value={values[i]}
                    onChange={(e) => setters[i](e.target.value)}
                    disabled={!canUpdate}
                  />
                </label>
              );
            })}
            {limits ? <p className={ui.muted}>Scope: {limits.scope}</p> : null}
            {canUpdate ? (
              <button type="submit" className={`${ui.btn} w-fit`} disabled={saving}>
                {saving ? 'Saving…' : 'Save limits'}
              </button>
            ) : (
              <p className={ui.muted}>Read-only (missing trading.limits.update).</p>
            )}
          </form>

          {canSuspend ? (
            <div className={`${ui.card} grid gap-4`}>
              <h2 className={ui.cardTitle}>Suspend / resume</h2>
              <label className="grid gap-1">
                <span className={ui.label}>Reason</span>
                <input className={ui.input} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>Event ID</span>
                <input className={ui.input} value={eventId} onChange={(e) => setEventId(e.target.value)} />
              </label>
              <button
                type="button"
                className={`${ui.btnDanger} w-fit`}
                onClick={() =>
                  void runAction(async () => {
                    await api!.suspendEvent(groupId!, eventId.trim(), reason.trim());
                    setMessage(`Event ${eventId} suspended.`);
                  })
                }
              >
                Suspend event
              </button>
              <label className="grid gap-1">
                <span className={ui.label}>Market ID</span>
                <input className={ui.input} value={marketId} onChange={(e) => setMarketId(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ui.btnDanger}
                  onClick={() =>
                    void runAction(async () => {
                      await api!.suspendMarket(groupId!, marketId.trim(), reason.trim());
                      setMessage(`Market ${marketId} suspended.`);
                    })
                  }
                >
                  Suspend market
                </button>
                <button
                  type="button"
                  className={ui.btnGhost}
                  onClick={() =>
                    void runAction(async () => {
                      await api!.resumeMarket(groupId!, marketId.trim());
                      setMessage(`Market ${marketId} resumed.`);
                    })
                  }
                >
                  Resume market
                </button>
              </div>
            </div>
          ) : null}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
