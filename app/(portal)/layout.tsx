'use client';

import { RequireAuth } from '@/components/require-auth';
import { PortalShell } from '@/components/portal-shell';
import { TenantProvider } from '@/components/tenant-context';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <TenantProvider>
        <PortalShell>{children}</PortalShell>
      </TenantProvider>
    </RequireAuth>
  );
}
