'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { useTenant } from '@/components/tenant-context';
import { PermissionGate } from '@/components/permission-gate';
import { suggestMerchantId } from '@/lib/merchant-onboarding';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function SettingsMerchantsPage() {
  const { api, staff } = useAuth();
  const { refreshTenants, setGroupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [merchantIdTouched, setMerchantIdTouched] = useState(false);
  const [sportsSecret, setSportsSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSlugChange(value: string) {
    setSlug(value);
    if (!merchantIdTouched) {
      setMerchantId(suggestMerchantId(value));
    }
  }

  function onMerchantIdChange(value: string) {
    setMerchantIdTouched(true);
    setMerchantId(value);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!api) return;
    setLoading(true);
    setError(null);
    setSportsSecret(null);
    const trimmedMerchantId = merchantId.trim();
    try {
      const result = await api.createMerchant({
        slug: slug.trim(),
        name: name.trim(),
        ...(trimmedMerchantId ? { merchantId: trimmedMerchantId } : {}),
      });
      setSportsSecret(result.sportsSecret);
      await refreshTenants();
      setGroupId(result.id);
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PermissionGate permission="tenant.create">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Merchant onboarding</h1>
          <p className={ui.muted}>
            Create a casino group and receive the plaintext sports secret once.
          </p>
        </header>
        <nav className="mb-6 flex flex-wrap gap-2">
          {hasPermission(staff?.permissions ?? [], 'tenant.read') ? (
            <Link href="/settings/tenant" className={ui.navLink}>
              Tenant
            </Link>
          ) : null}
          <Link href="/settings/merchants" className={ui.navLinkActive}>
            Merchants
          </Link>
        </nav>
        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
        <form className={`${ui.card} grid max-w-xl gap-4`} onSubmit={onSubmit}>
          <label className="grid gap-1">
            <span className={ui.label}>Tenant slug</span>
            <input
              className={ui.input}
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="luckystar"
              pattern="[a-z][a-z0-9-]{1,48}"
              title="Lowercase letters, numbers, and hyphens"
              required
            />
            <span className={ui.muted}>
              Internal key for the back office and dev API header{' '}
              <code className="text-zinc-300">X-Casino-Group</code>.
            </span>
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>Display name</span>
            <input
              className={ui.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="LuckyStar Casino"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>Launch JWT merchant ID</span>
            <input
              className={ui.input}
              value={merchantId}
              onChange={(e) => onMerchantIdChange(e.target.value)}
              placeholder={suggestMerchantId(slug) || 'luckystar-merchant'}
            />
            <span className={ui.muted}>
              Value your operator platform puts in the player launch token{' '}
              <code className="text-zinc-300">merchantId</code> claim. Auto-filled
              from the slug; edit only if your integration uses a different id.
            </span>
          </label>
          <button type="submit" className={`${ui.btn} w-fit`} disabled={loading}>
            {loading ? 'Creating…' : 'Create merchant'}
          </button>
        </form>
        {sportsSecret ? (
          <div className={`${ui.card} mt-4`}>
            <h2 className={ui.cardTitle}>Sports secret (copy now)</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-amber-300">
              {sportsSecret}
            </pre>
          </div>
        ) : null}
      </div>
    </PermissionGate>
  );
}
