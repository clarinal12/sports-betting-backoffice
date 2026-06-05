'use client';

import { useTenant } from './tenant-context';
import { ui } from '@/lib/ui';

export function TenantRequired({ children }: { children: React.ReactNode }) {
  const { groupId, isPlatformStaff } = useTenant();

  if (!groupId) {
    return (
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>Select a tenant</h2>
        <p className={ui.muted}>
          {isPlatformStaff
            ? 'Choose a casino group in the header to manage an existing tenant. To add a new brand, use Onboarding (no tenant selection required).'
            : 'Your account is not linked to a casino group.'}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
