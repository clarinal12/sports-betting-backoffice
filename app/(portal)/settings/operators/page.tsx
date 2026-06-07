'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth, useApiErrorHandler } from '@/components/auth-provider';
import { PermissionGate } from '@/components/permission-gate';
import { SettingsNav } from '@/components/settings-nav';
import { TenantRequired } from '@/components/tenant-required';
import { useTenant } from '@/components/tenant-context';
import type { OperatorStaffAccount } from '@/lib/types';
import { hasPermission } from '@/lib/permissions';
import { ui } from '@/lib/ui';

export default function SettingsOperatorsPage() {
  const { api, staff } = useAuth();
  const { groupId } = useTenant();
  const handleError = useApiErrorHandler();
  const [operators, setOperators] = useState<OperatorStaffAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const canUpdate = hasPermission(staff?.permissions ?? [], 'staff.operator.update');

  const loadOperators = useCallback(async () => {
    if (!api || !groupId) return;
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
  }, [api, groupId, handleError]);

  useEffect(() => {
    void loadOperators();
  }, [loadOperators]);

  function startEdit(operator: OperatorStaffAccount) {
    setEditingId(operator.id);
    setEditEmail(operator.email);
    setEditPassword('');
    setMessage(null);
    setError(null);
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

  return (
    <PermissionGate permission="staff.operator.read">
      <div className={ui.page}>
        <header className="mb-4">
          <h1 className="text-3xl font-semibold">Operator accounts</h1>
          <p className={ui.muted}>
            Manage merchant back-office logins for the selected tenant.
          </p>
        </header>
        <SettingsNav active="operators" />
        <TenantRequired>
          {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
          {message ? <p className="mb-4 text-sm text-zinc-400">{message}</p> : null}
          {loading ? <p className={ui.muted}>Loading operator accounts…</p> : null}
          {!loading && operators.length === 0 ? (
            <p className={ui.muted}>
              No operator accounts for this tenant. Create a merchant to provision
              one, or add an operator during onboarding.
            </p>
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
                      <p className="font-medium text-zinc-100">{operator.email}</p>
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
        </TenantRequired>
      </div>
    </PermissionGate>
  );
}
