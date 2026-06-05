'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { StatCard } from '@/components/stat-card';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { AnalyticsSummary, ExposureSummary } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function HomePage() {
  const { api, staff } = useAuth();
  const { groupId, tenant } = useTenant();
  const handleError = useApiErrorHandler();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [exposure, setExposure] = useState<ExposureSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !groupId || !staff) {
      return;
    }
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const tasks: Promise<void>[] = [];
        if (hasPermission(staff!.permissions, 'analytics.read')) {
          tasks.push(
            api!.getAnalyticsSummary(groupId!).then((data) => {
              if (!cancelled) setAnalytics(data);
            }),
          );
        }
        if (hasPermission(staff!.permissions, 'trading.read')) {
          tasks.push(
            api!.getExposure(groupId!).then((data) => {
              if (!cancelled) setExposure(data);
            }),
          );
        }
        await Promise.all(tasks);
      } catch (err) {
        if (!cancelled) setError(await handleError(err));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, groupId, staff, handleError]);

  return (
    <div className={ui.page}>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
        <p className={ui.muted}>
          {tenant
            ? `${tenant.name} (${tenant.slug})`
            : 'KPIs and quick links for the selected tenant.'}
        </p>
      </header>

      <TenantRequired>
        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

        <PermissionGate permission="analytics.read">
          <section className={`${ui.card} mb-4`}>
            <h2 className={ui.cardTitle}>Performance snapshot</h2>
            {analytics ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Open bets"
                  value={analytics.openLiability.betCount}
                  hint={`Stake ${analytics.openLiability.stake}`}
                />
                <StatCard
                  label="GGR (settled)"
                  value={analytics.ggr.gross}
                  hint={`Payouts ${analytics.ggr.payouts}`}
                />
                <StatCard
                  label="Accepted"
                  value={analytics.byStatus.ACCEPTED?.count ?? 0}
                />
                <StatCard
                  label="Won / Lost"
                  value={`${analytics.byStatus.WON?.count ?? 0} / ${analytics.byStatus.LOST?.count ?? 0}`}
                />
              </div>
            ) : (
              <p className={`${ui.muted} mt-3`}>Loading analytics…</p>
            )}
            <Link href="/analytics" className="mt-4 inline-block text-sm text-violet-400">
              View analytics →
            </Link>
          </section>
        </PermissionGate>

        <PermissionGate permission="trading.read">
          <section className={`${ui.card} mb-4`}>
            <h2 className={ui.cardTitle}>Trading exposure</h2>
            {exposure ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Open bets" value={exposure.openBetCount} />
                <StatCard
                  label="Total stake"
                  value={exposure.totalStake}
                  hint={exposure.currency ?? undefined}
                />
                <StatCard
                  label="Potential payout"
                  value={exposure.totalPotentialPayout}
                />
                <StatCard
                  label="Events"
                  value={exposure.byEvent.length}
                />
              </div>
            ) : (
              <p className={`${ui.muted} mt-3`}>Loading exposure…</p>
            )}
            <Link
              href="/trading/exposure"
              className="mt-4 inline-block text-sm text-violet-400"
            >
              View exposure →
            </Link>
          </section>
        </PermissionGate>

        <section className={ui.card}>
          <h2 className={ui.cardTitle}>Quick links</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {hasPermission(staff?.permissions ?? [], 'bets.read') ? (
              <Link href="/bets" className={ui.navLink}>
                Bet monitor
              </Link>
            ) : null}
            {hasPermission(staff?.permissions ?? [], 'settlement.read') ? (
              <Link href="/settlement" className={ui.navLink}>
                Settlement queue
              </Link>
            ) : null}
            {hasPermission(staff?.permissions ?? [], 'compliance.audit.read') ? (
              <Link href="/compliance/audit" className={ui.navLink}>
                Audit log
              </Link>
            ) : null}
            {hasPermission(staff?.permissions ?? [], 'product.leagues.read') ? (
              <Link href="/product/leagues" className={ui.navLink}>
                League offering
              </Link>
            ) : null}
          </div>
        </section>
      </TenantRequired>
    </div>
  );
}
