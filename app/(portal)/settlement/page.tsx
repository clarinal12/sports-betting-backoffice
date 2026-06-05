'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import {
  canRunSettlement,
  isPlatformSettlementRole,
  needsSettlementRelogin,
} from '@/lib/settlement-access';
import type { SettlementRunResult, UnsettledEvent } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function SettlementPage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [events, setEvents] = useState<UnsettledEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<string, { home: string; away: string }>>(
    {},
  );
  const [manualRef, setManualRef] = useState('');
  const [manualHome, setManualHome] = useState('');
  const [manualAway, setManualAway] = useState('');

  const canRun = canRunSettlement(staff);
  const mustRelogin = needsSettlementRelogin(staff);

  const loadEvents = useCallback(async () => {
    if (!api || !groupId) return;
    setError(null);
    try {
      setEvents(await api.listUnsettledEvents(groupId));
    } catch (err) {
      setError(await handleError(err));
    }
  }, [api, groupId, handleError]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function scoreFor(event: UnsettledEvent) {
    return (
      scoreDraft[event.eventId] ?? {
        home: event.homeScore?.toString() ?? '',
        away: event.awayScore?.toString() ?? '',
      }
    );
  }

  function setScoreField(
    eventId: string,
    field: 'home' | 'away',
    value: string,
    fallback: UnsettledEvent,
  ) {
    const current = scoreDraft[eventId] ?? {
      home: fallback.homeScore?.toString() ?? '',
      away: fallback.awayScore?.toString() ?? '',
    };
    setScoreDraft((draft) => ({
      ...draft,
      [eventId]: { ...current, [field]: value },
    }));
  }

  function formatRunMessage(result: SettlementRunResult) {
    if (result.attempted === 0) {
      return 'No open bets were found for this event.';
    }
    if (result.settled === result.attempted) {
      return `Settled ${result.settled} bet(s).`;
    }
    return `Settled ${result.settled} of ${result.attempted} bet(s); ${result.remainingOpenBets} still open (check blockers or parlay legs on other events).`;
  }

  function parseScores(home: string, away: string): { homeScore: number; awayScore: number } | null {
    const homeScore = Number.parseInt(home, 10);
    const awayScore = Number.parseInt(away, 10);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
      return null;
    }
    return { homeScore, awayScore };
  }

  async function onRunSettlement(eventId: string) {
    if (!api || !groupId) return;
    setActiveEventId(eventId);
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.runEventSettlement(groupId, eventId);
      setMessage(formatRunMessage(result));
      await loadEvents();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
      setActiveEventId(null);
    }
  }

  async function onApplyResult(event: UnsettledEvent) {
    if (!api || !groupId) return;
    const scores = scoreFor(event);
    const parsed = parseScores(scores.home, scores.away);
    if (!parsed) {
      setError('Enter valid home and away scores.');
      return;
    }

    setActiveEventId(event.eventId);
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.applyEventResult(groupId, event.eventId, parsed);
      setMessage(
        `Result declared (${parsed.homeScore}–${parsed.awayScore}). ${formatRunMessage(result)}`,
      );
      await loadEvents();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
      setActiveEventId(null);
    }
  }

  async function onManualDeclare(event: FormEvent) {
    event.preventDefault();
    if (!api || !groupId) return;
    const parsed = parseScores(manualHome, manualAway);
    const providerRef = manualRef.trim();
    if (!providerRef) {
      setError('Enter the event provider reference.');
      return;
    }
    if (!parsed) {
      setError('Enter valid home and away scores.');
      return;
    }

    setActiveEventId('manual');
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.applyProviderResult(groupId, {
        providerRef,
        ...parsed,
      });
      setMessage(
        `Result declared for ${providerRef} (${parsed.homeScore}–${parsed.awayScore}). ${formatRunMessage(result)}`,
      );
      setManualRef('');
      setManualHome('');
      setManualAway('');
      await loadEvents();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
      setActiveEventId(null);
    }
  }

  const roleLabel = staff?.roles.join(', ') ?? 'unknown';

  return (
    <PermissionGate permission="settlement.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Settlement queue</h1>
          <p className={ui.muted}>
            Declare final scores to grade winners, then settle open bets for the
            selected merchant.
          </p>
        </header>
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-emerald-400">{message}</p> : null}

          {mustRelogin ? (
            <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              You are signed in as a platform user ({roleLabel}) but your session is
              missing settlement permission. Sign out and sign back in to declare
              results.
            </p>
          ) : null}

          {!canRun && !mustRelogin ? (
            <p className={`${ui.muted} mb-4`}>
              Signed in as <strong className="text-zinc-300">{staff?.email}</strong>{' '}
              ({roleLabel}). Declaring results requires a platform super-user or
              platform admin assigned to this merchant.
            </p>
          ) : null}

          {canRun ? (
            <form className={`${ui.card} mb-6 grid gap-4`} onSubmit={onManualDeclare}>
              <div>
                <h2 className={ui.cardTitle}>Declare result manually</h2>
                <p className={ui.muted}>
                  Use when an event is not in the queue yet. Enter the provider
                  reference and final score; winners are graded and open bets settle
                  automatically.
                </p>
              </div>
              <label className="grid gap-1">
                <span className={ui.label}>Event provider ref</span>
                <input
                  className={ui.input}
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder="fd1e64710aa2e27f2e169c43a290c3c3"
                  required
                />
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <label className="grid gap-1">
                  <span className={ui.label}>Home score</span>
                  <input
                    className={`${ui.input} w-28`}
                    inputMode="numeric"
                    value={manualHome}
                    onChange={(e) => setManualHome(e.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-1">
                  <span className={ui.label}>Away score</span>
                  <input
                    className={`${ui.input} w-28`}
                    inputMode="numeric"
                    value={manualAway}
                    onChange={(e) => setManualAway(e.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className={ui.btn}
                  disabled={loading && activeEventId === 'manual'}
                >
                  {loading && activeEventId === 'manual'
                    ? 'Declaring…'
                    : 'Declare result & settle'}
                </button>
              </div>
            </form>
          ) : null}

          <div className={`${ui.card} overflow-x-auto`}>
            <h2 className={`${ui.cardTitle} mb-3`}>Open bets waiting on results</h2>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Matchup</th>
                  <th className={ui.th}>Open bets</th>
                  <th className={ui.th}>Final score</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Blockers</th>
                  <th className={ui.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const scores = scoreFor(event);
                  const busy = loading && activeEventId === event.eventId;

                  return (
                    <tr key={event.eventId}>
                      <td className={ui.td}>
                        {event.matchup}
                        <div className="text-xs text-zinc-500">{event.providerRef}</div>
                      </td>
                      <td className={ui.td}>{event.openBetCount}</td>
                      <td className={ui.td}>
                        {canRun ? (
                          <div className="flex items-center gap-2">
                            <input
                              className={`${ui.input} w-16`}
                              inputMode="numeric"
                              value={scores.home}
                              onChange={(e) =>
                                setScoreField(event.eventId, 'home', e.target.value, event)
                              }
                              placeholder="H"
                              disabled={busy}
                              aria-label="Home score"
                            />
                            <span className="text-zinc-500">–</span>
                            <input
                              className={`${ui.input} w-16`}
                              inputMode="numeric"
                              value={scores.away}
                              onChange={(e) =>
                                setScoreField(event.eventId, 'away', e.target.value, event)
                              }
                              placeholder="A"
                              disabled={busy}
                              aria-label="Away score"
                            />
                          </div>
                        ) : (
                          <>
                            {event.homeScore ?? '—'} – {event.awayScore ?? '—'}
                          </>
                        )}
                      </td>
                      <td className={ui.td}>
                        <span className={ui.badge}>{event.eventStatus}</span>
                        <div className="mt-1 text-xs text-zinc-500">
                          Market {event.marketStatus ?? '—'}
                        </div>
                        <div
                          className={
                            event.readyToSettle
                              ? 'mt-1 text-xs text-emerald-400'
                              : 'mt-1 text-xs text-amber-400'
                          }
                        >
                          {event.readyToSettle ? 'Ready to settle' : 'Needs result'}
                        </div>
                      </td>
                      <td className={ui.td}>
                        {event.blockers.length > 0 ? (
                          <ul className="list-disc pl-4 text-xs text-zinc-400">
                            {event.blockers.map((blocker) => (
                              <li key={blocker}>{blocker}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-zinc-500">None</span>
                        )}
                      </td>
                      <td className={ui.td}>
                        <div className="flex min-w-[10rem] flex-col gap-2">
                          <Link
                            href={`/bets?status=ACCEPTED&eventId=${event.eventId}`}
                            className={ui.btnGhost + ' text-center'}
                          >
                            View bets
                          </Link>
                          {canRun ? (
                            event.readyToSettle ? (
                              <button
                                type="button"
                                className={ui.btn}
                                disabled={busy}
                                onClick={() => void onRunSettlement(event.eventId)}
                              >
                                {busy ? 'Settling…' : 'Settle bets'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={ui.btn}
                                disabled={busy}
                                onClick={() => void onApplyResult(event)}
                              >
                                {busy ? 'Declaring…' : 'Declare result & settle'}
                              </button>
                            )
                          ) : isPlatformSettlementRole(staff) ? (
                            <span className="text-xs text-amber-400">Re-login to act</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {events.length === 0 ? (
              <div className={`${ui.muted} mt-3 space-y-2`}>
                <p>No unsettled events with open bets for this merchant.</p>
                {canRun ? (
                  <p>
                    If you expect open bets, confirm the tenant picker matches where
                    players placed wagers. Otherwise use{' '}
                    <strong className="text-zinc-300">Declare result manually</strong>{' '}
                    above once you have the event provider ref.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
