'use client';

import { FormEvent, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { useTenant } from '@/components/tenant-context';
import { PermissionGate } from '@/components/permission-gate';
import { SettingsNav } from '@/components/settings-nav';
import {
  suggestMerchantId,
  suggestOperatorEmail,
} from '@/lib/merchant-onboarding';
import type { CreateMerchantOperatorAdmin } from '@/lib/types';
import { ui } from '@/lib/ui';

export default function SettingsMerchantsPage() {
  const { api } = useAuth();
  const { refreshTenants, setGroupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [merchantIdTouched, setMerchantIdTouched] = useState(false);
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorEmailTouched, setOperatorEmailTouched] = useState(false);
  const [operatorPassword, setOperatorPassword] = useState('');
  const [sportsSecret, setSportsSecret] = useState<string | null>(null);
  const [operatorAdmin, setOperatorAdmin] =
    useState<CreateMerchantOperatorAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onSlugChange(value: string) {
    setSlug(value);
    if (!merchantIdTouched) {
      setMerchantId(suggestMerchantId(value));
    }
    if (!operatorEmailTouched) {
      setOperatorEmail(suggestOperatorEmail(value));
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
    setOperatorAdmin(null);
    const trimmedMerchantId = merchantId.trim();
    const trimmedOperatorEmail = operatorEmail.trim();
    const trimmedOperatorPassword = operatorPassword.trim();
    try {
      const result = await api.createMerchant({
        slug: slug.trim(),
        name: name.trim(),
        ...(trimmedMerchantId ? { merchantId: trimmedMerchantId } : {}),
        ...(trimmedOperatorEmail ? { operatorEmail: trimmedOperatorEmail } : {}),
        ...(trimmedOperatorPassword
          ? { operatorPassword: trimmedOperatorPassword }
          : {}),
      });
      setSportsSecret(result.sportsSecret);
      setOperatorAdmin(result.operatorAdmin);
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
            Create a casino group, an operator back-office login, and the
            plaintext sports secret (shown once).
          </p>
        </header>
        <SettingsNav active="merchants" />
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
          <label className="grid gap-1">
            <span className={ui.label}>Operator email</span>
            <input
              className={ui.input}
              type="email"
              value={operatorEmail}
              onChange={(e) => {
                setOperatorEmailTouched(true);
                setOperatorEmail(e.target.value);
              }}
              placeholder={suggestOperatorEmail(slug) || 'admin@luckystar.merchant.local'}
            />
            <span className={ui.muted}>
              Merchant staff login at the back office (OPERATOR_ADMIN). Password
              is optional — leave blank to auto-generate.
            </span>
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>Operator password (optional)</span>
            <input
              className={ui.input}
              type="password"
              value={operatorPassword}
              onChange={(e) => setOperatorPassword(e.target.value)}
              placeholder="Min 8 characters if set"
              minLength={8}
            />
          </label>
          <button type="submit" className={`${ui.btn} w-fit`} disabled={loading}>
            {loading ? 'Creating…' : 'Create merchant'}
          </button>
        </form>
        {operatorAdmin ? (
          <div className={`${ui.card} mt-4`}>
            <h2 className={ui.cardTitle}>Operator login (copy now)</h2>
            <p className={`${ui.muted} mt-1`}>
              Sign in at the back office with this tenant-scoped account.
            </p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className={ui.label}>Email</dt>
                <dd className="font-mono text-zinc-200">{operatorAdmin.email}</dd>
              </div>
              <div>
                <dt className={ui.label}>Password</dt>
                <dd className="font-mono text-amber-300">{operatorAdmin.password}</dd>
              </div>
            </dl>
            {operatorAdmin.passwordAutoGenerated ? (
              <p className={`${ui.muted} mt-2 text-xs`}>
                Password was auto-generated. Store it securely; it is not shown again.
              </p>
            ) : null}
          </div>
        ) : null}
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
