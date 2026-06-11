'use client';

import { useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { LeagueOffering } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { isPlatformStaff } from '@/lib/staff-roles';
import { ui } from '@/lib/ui';

export default function ProductLeaguesPage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [leagues, setLeagues] = useState<LeagueOffering[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const canUpdate = hasPermission(staff?.permissions ?? [], 'product.leagues.update');
  const platformStaff = isPlatformStaff(staff);

  function canToggleLeague(league: LeagueOffering): boolean {
    if (!canUpdate) {
      return false;
    }
    if (league.enabled) {
      return true;
    }
    if (league.platformLocked && !platformStaff) {
      return false;
    }
    return true;
  }

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
    if (!api || !groupId || !canToggleLeague(league)) return;
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
                      {league.platformLocked && !league.enabled ? (
                        <div className="mt-1 text-xs text-amber-500/90">
                          Disabled by platform
                        </div>
                      ) : null}
                    </td>
                    <td className={ui.td}>
                      {canToggleLeague(league) ? (
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
                      ) : league.platformLocked && !league.enabled ? (
                        <span className={`${ui.muted} text-xs`}>
                          Contact platform support
                        </span>
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
