'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { SettingsNav } from '@/components/settings-nav';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import { suggestOperatorEmail } from '@/lib/merchant-onboarding';
import type {
  CreateMerchantOperatorAdmin,
  OperatorStaffAccount,
} from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { isTenantOperator } from '@/lib/staff-roles';
import { ui } from '@/lib/ui';

export default function SettingsOperatorsPage() {
  const { api, staff, logout } = useAuth();
  const { groupId, tenant, accessibleTenants } = useTenant();
  const handleError = useApiErrorHandler();
  const tenantOperator = isTenantOperator(staff);
  const [operators, setOperators] = useState<OperatorStaffAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [createEmail, setCreateEmail] = useState('');
  const [createEmailTouched, setCreateEmailTouched] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdOperator, setCreatedOperator] =
    useState<CreateMerchantOperatorAdmin | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const canUpdate = hasPermission(staff?.permissions ?? [], 'staff.operator.update');

  const tenantSlug = useMemo(() => {
    if (tenant?.slug) return tenant.slug;
    return accessibleTenants.find((row) => row.id === groupId)?.slug ?? '';
  }, [tenant?.slug, accessibleTenants, groupId]);

  const suggestedEmail = useMemo(
    () => suggestOperatorEmail(tenantSlug),
    [tenantSlug],
  );

  const loadOperators = useCallback(async () => {
    if (!api || !groupId || tenantOperator) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listOperatorAdmins(groupId);
      setOperators(rows);
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setLoading(false);
    }
  }, [api, groupId, handleError, tenantOperator]);

  useEffect(() => {
    void loadOperators();
  }, [loadOperators]);

  useEffect(() => {
    if (!createEmailTouched && suggestedEmail) {
      setCreateEmail(suggestedEmail);
    }
  }, [suggestedEmail, createEmailTouched]);

  useEffect(() => {
    setCreateEmailTouched(false);
    setCreatePassword('');
    setCreatedOperator(null);
    setEditingId(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [groupId]);

  useEffect(() => {
    if (loading || tenantOperator) return;
    setShowCreateForm(operators.length === 0 && canUpdate);
  }, [loading, operators.length, canUpdate, tenantOperator]);

  function startEdit(operator: OperatorStaffAccount) {
    setEditingId(operator.id);
    setEditEmail(operator.email);
    setEditPassword('');
    setMessage(null);
    setError(null);
    setShowCreateForm(false);
    setCreatedOperator(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditEmail('');
    setEditPassword('');
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!api || !groupId || !editingId) return;
    if (!editEmail.trim() && !editPassword.trim()) {
      setError('Provide a new email and/or password.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.updateOperatorAdmin(groupId, editingId, {
        ...(editEmail.trim() ? { email: editEmail.trim() } : {}),
        ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
      });
      setMessage('Operator account updated.');
      cancelEdit();
      await loadOperators();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!api || !groupId) return;
    const email = createEmail.trim();
    if (!email) {
      setError('Operator email is required.');
      return;
    }
    setCreating(true);
    setError(null);
    setMessage(null);
    setCreatedOperator(null);
    try {
      const trimmedPassword = createPassword.trim();
      const result = await api.createOperatorAdmin(groupId, {
        email,
        ...(trimmedPassword ? { password: trimmedPassword } : {}),
      });
      setCreatedOperator({
        email: result.email,
        password: result.password,
        passwordAutoGenerated: result.passwordAutoGenerated,
        roles: result.roles,
      });
      setMessage('Operator account created.');
      setShowCreateForm(false);
      setCreatePassword('');
      setCreateEmailTouched(false);
      await loadOperators();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setCreating(false);
    }
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    if (!api) return;
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    setError(null);
    setMessage(null);
    try {
      await api.changeOwnPassword({
        currentPassword,
        newPassword,
      });
      setMessage('Password updated. Sign in again with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      logout();
    } catch (err) {
      setError(await handleError(err));
    } finally {
      setChangingPassword(false);
    }
  }

  const emptyState = !loading && operators.length === 0;

  return (
    <PermissionGate permission="staff.operator.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">
            {tenantOperator ? 'Account' : 'Operator accounts'}
          </h1>
          <p className={ui.muted}>
            {tenantOperator
              ? 'Update your back-office password.'
              : 'Manage merchant back-office logins for the selected tenant.'}
          </p>
        </header>
        <SettingsNav active="operators" />
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-zinc-400">{message}</p> : null}

          {tenantOperator ? (
            <form
              className={`${ui.card} grid max-w-xl gap-4`}
              onSubmit={onChangePassword}
            >
              <h2 className={ui.cardTitle}>Change password</h2>
              <p className={ui.muted}>
                Signed in as <span className="text-zinc-200">{staff?.email}</span>
              </p>
              <label className="grid gap-1">
                <span className={ui.label}>Current password</span>
                <input
                  className={ui.input}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>New password</span>
                <input
                  className={ui.input}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className={ui.label}>Confirm new password</span>
                <input
                  className={ui.input}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button
                type="submit"
                className={`${ui.btn} w-fit`}
                disabled={changingPassword}
              >
                {changingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          ) : (
            <>
              {loading ? (
                <p className={ui.muted}>Loading operator accounts…</p>
              ) : null}

              {emptyState && !canUpdate ? (
                <p className={ui.muted}>
                  No operator accounts for this tenant. Ask a platform
                  administrator to provision one.
                </p>
              ) : null}

              {canUpdate && operators.length > 0 && !showCreateForm ? (
                <button
                  type="button"
                  className={`${ui.btnGhost} mb-4`}
                  onClick={() => {
                    setShowCreateForm(true);
                    setEditingId(null);
                    setError(null);
                    setMessage(null);
                    setCreatedOperator(null);
                  }}
                >
                  Add operator account
                </button>
              ) : null}

              {showCreateForm && canUpdate ? (
                <form
                  className={`${ui.card} mb-4 grid max-w-xl gap-4`}
                  onSubmit={onCreate}
                >
                  <h2 className={ui.cardTitle}>
                    {emptyState ? 'Add operator account' : 'New operator account'}
                  </h2>
                  {emptyState ? (
                    <p className={ui.muted}>
                      This tenant has no operator login yet. Create one so
                      merchant staff can sign in to the back office.
                    </p>
                  ) : null}
                  <label className="grid gap-1">
                    <span className={ui.label}>Email</span>
                    <input
                      className={ui.input}
                      type="email"
                      value={createEmail}
                      onChange={(e) => {
                        setCreateEmailTouched(true);
                        setCreateEmail(e.target.value);
                      }}
                      placeholder={suggestedEmail || 'admin@tenant.merchant.local'}
                      required
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className={ui.label}>Password (optional)</span>
                    <input
                      className={ui.input}
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Min 8 characters if set"
                      minLength={8}
                    />
                    <span className={ui.muted}>
                      Leave blank to auto-generate a one-time password.
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className={ui.btn} disabled={creating}>
                      {creating ? 'Creating…' : 'Create operator'}
                    </button>
                    {!emptyState ? (
                      <button
                        type="button"
                        className={ui.btnGhost}
                        onClick={() => {
                          setShowCreateForm(false);
                          setCreatePassword('');
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
              ) : null}

              {createdOperator ? (
                <div className={`${ui.card} mb-4`}>
                  <h2 className={ui.cardTitle}>Operator login (copy now)</h2>
                  <p className={`${ui.muted} mt-1`}>
                    Sign in at the back office with this tenant-scoped account.
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div>
                      <dt className={ui.label}>Email</dt>
                      <dd className="font-mono text-zinc-200">
                        {createdOperator.email}
                      </dd>
                    </div>
                    <div>
                      <dt className={ui.label}>Password</dt>
                      <dd className="font-mono text-amber-300">
                        {createdOperator.password}
                      </dd>
                    </div>
                  </dl>
                  {createdOperator.passwordAutoGenerated ? (
                    <p className={`${ui.muted} mt-2 text-xs`}>
                      Password was auto-generated. Store it securely; it is not
                      shown again.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <ul className="grid gap-4">
                {operators.map((operator) => (
                  <li key={operator.id} className={ui.card}>
                    {editingId === operator.id ? (
                      <form className="grid gap-3" onSubmit={onSave}>
                        <p className={ui.muted}>
                          <code>{operator.id}</code>
                        </p>
                        <label className="grid gap-1">
                          <span className={ui.label}>Email</span>
                          <input
                            className={ui.input}
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            required
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className={ui.label}>New password (optional)</span>
                          <input
                            className={ui.input}
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            minLength={8}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className={ui.btn}
                            disabled={saving || !canUpdate}
                          >
                            {saving ? 'Saving…' : 'Save changes'}
                          </button>
                          <button
                            type="button"
                            className={ui.btnGhost}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-zinc-100">
                            {operator.email}
                          </p>
                          <p className={`${ui.muted} mt-1 text-sm`}>
                            {operator.roles.join(', ')} · {operator.status}
                          </p>
                        </div>
                        {canUpdate ? (
                          <button
                            type="button"
                            className={ui.btnGhost}
                            onClick={() => startEdit(operator)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
