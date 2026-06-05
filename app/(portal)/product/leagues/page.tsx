'use client';

import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { LeagueOffering } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function ProductLeaguesPage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [leagues, setLeagues] = useState<LeagueOffering[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const canUpdate = hasPermission(staff?.permissions ?? [], 'product.leagues.update');

  useEffect(() => {
    if (!api || !groupId) return;
    let cancelled = false;
    void api
      .listLeagues(groupId)
      .then((result) => {
        if (!cancelled) setLeagues(result);
      })
      .catch(async (err) => {
        if (!cancelled) setError(await handleError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [api, groupId, handleError]);

  async function toggleLeague(league: LeagueOffering) {
    if (!api || !groupId || !canUpdate) return;
    setSavingId(league.leagueId);
    setError(null);
    try {
      setLeagues(
        await api.updateLeagues(groupId, [
          { leagueId: league.leagueId, enabled: !league.enabled },
        ]),
      );
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <PermissionGate permission="product.leagues.read">
      <div className={ui.page}>
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Sports & competitions</h1>
          <p className={ui.muted}>Enable or disable leagues for the tenant.</p>
        </header>
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          <div className={`${ui.card} overflow-x-auto`}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>League</th>
                  <th className={ui.th}>Sport</th>
                  <th className={ui.th}>Region</th>
                  <th className={ui.th}>Enabled</th>
                  <th className={ui.th} />
                </tr>
              </thead>
              <tbody>
                {leagues.map((league) => (
                  <tr key={league.leagueId}>
                    <td className={ui.td}>
                      {league.name}
                      <div className="text-xs text-zinc-500">{league.key}</div>
                    </td>
                    <td className={ui.td}>{league.sportName}</td>
                    <td className={ui.td}>{league.region ?? '—'}</td>
                    <td className={ui.td}>
                      <span className={ui.badge}>
                        {league.enabled ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className={ui.td}>
                      {canUpdate ? (
                        <button
                          type="button"
                          className={ui.btnGhost}
                          disabled={savingId === league.leagueId}
                          onClick={() => void toggleLeague(league)}
                        >
                          {savingId === league.leagueId
                            ? 'Saving…'
                            : league.enabled
                              ? 'Disable'
                              : 'Enable'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leagues.length === 0 ? (
              <p className={`${ui.muted} mt-3`}>No leagues in catalog.</p>
            ) : null}
          </div>
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
