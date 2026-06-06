'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { Bet } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import {
  VOID_REASON_CODES,
  formatVoidReason,
  isVoidNoteRequired,
  validateVoidReason,
} from '@/lib/void-reasons';
import { ui } from '@/lib/ui';

export default function BetDetailPage() {
  const params = useParams<{ id: string }>();
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [bet, setBet] = useState<Bet | null>(null);
  const [reasonCode, setReasonCode] = useState<string>(VOID_REASON_CODES[0].code);
  const [reasonNote, setReasonNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const canVoid = hasPermission(staff?.permissions ?? [], 'bets.void');

  useEffect(() => {
    if (!api || !groupId || !params.id) return;
    let cancelled = false;
    void api
      .getBet(groupId, params.id)
      .then((result) => {
        if (!cancelled) setBet(result);
      })
      .catch(async (err) => {
        if (!cancelled) setError(await handleError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, params.id, handleError]);

  const noteRequired = isVoidNoteRequired(reasonCode);

  async function onVoid(event: FormEvent) {
    event.preventDefault();
    if (!api || !groupId || !bet) return;
    const validationError = validateVoidReason(reasonCode, reasonNote);
    if (validationError) {
      setError(validationError);
      return;
    }
    const reason = formatVoidReason(reasonCode, reasonNote);
    if (
      !window.confirm(
        `Void bet ${bet.id.slice(0, 12)}… and refund ${bet.stake} ${bet.currency}?\nReason: ${reason}`,
      )
    ) {
      return;
    }
    setVoiding(true);
    setError(null);
    setMessage(null);
    try {
      setBet(await api.voidBet(groupId, bet.id, reason));
      setMessage('Bet voided and stake refunded.');
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setVoiding(false);
    }
  }

  return (
    <PermissionGate permission="bets.read">
      <div className={ui.page}>
        <Link href="/bets" className="text-sm text-zinc-400">
          ← Bet monitor
        </Link>
        <header className="mb-6 mt-2">
          <h1 className="text-3xl font-semibold">Bet detail</h1>
        </header>
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-zinc-400">{message}</p> : null}
          {bet ? (
            <>
              <div className={`${ui.card} mb-4 grid gap-2 text-sm`}>
                <p>
                  <strong>ID</strong> <code>{bet.id}</code>
                </p>
                <p>
                  <strong>User</strong> <code>{bet.userId}</code>
                </p>
                <p>
                  <strong>Status</strong>{' '}
                  <span className={ui.badge}>{bet.status}</span>
                </p>
                <p>
                  <strong>Stake</strong> {bet.stake} {bet.currency}
                </p>
                <p>
                  <strong>Odds</strong> {bet.combinedOdds} · potential{' '}
                  {bet.potentialPayout}
                </p>
                {bet.settlementNote ? (
                  <p>
                    <strong>Note</strong> {bet.settlementNote}
                  </p>
                ) : null}
                <p className={ui.muted}>
                  Created {new Date(bet.createdAt).toLocaleString()}
                </p>
              </div>
              <div className={`${ui.card} mb-4 overflow-x-auto`}>
                <h2 className={ui.cardTitle}>Legs</h2>
                <table className={`${ui.table} mt-3`}>
                  <thead>
                    <tr>
                      <th className={ui.th}>Matchup</th>
                      <th className={ui.th}>Selection</th>
                      <th className={ui.th}>Price</th>
                      <th className={ui.th}>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bet.legs.map((leg) => (
                      <tr key={leg.selectionId}>
                        <td className={ui.td}>
                          {leg.homeTeamName && leg.awayTeamName
                            ? `${leg.homeTeamName} vs ${leg.awayTeamName}`
                            : leg.eventProviderRef ?? leg.eventId}
                        </td>
                        <td className={ui.td}>{leg.selectionName}</td>
                        <td className={ui.td}>{leg.priceAtPlacement}</td>
                        <td className={ui.td}>{leg.outcome ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canVoid && bet.status === 'ACCEPTED' ? (
                <form className={`${ui.card} grid gap-4`} onSubmit={onVoid}>
                  <h2 className={ui.cardTitle}>Void bet</h2>
                  <label className="grid gap-1">
                    <span className={ui.label}>Reason code</span>
                    <select
                      className={ui.input}
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value)}
                    >
                      {VOID_REASON_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className={ui.label}>
                      Note {noteRequired ? '(required)' : '(optional)'}
                    </span>
                    <input
                      className={ui.input}
                      value={reasonNote}
                      onChange={(e) => setReasonNote(e.target.value)}
                      placeholder={
                        noteRequired
                          ? 'Explain why this bet is being voided'
                          : 'Support ticket or trader note'
                      }
                      required={noteRequired}
                    />
                  </label>
                  <button
                    type="submit"
                    className={`${ui.btnDanger} w-fit`}
                    disabled={voiding || (noteRequired && !reasonNote.trim())}
                  >
                    {voiding ? 'Voiding…' : 'Void and refund stake'}
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <p className={ui.muted}>Loading…</p>
          )}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
