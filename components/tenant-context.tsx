'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loadTenantGroupId, saveTenantGroupId } from '@/lib/auth-storage';
import { useAuth } from './auth-provider';
import type { Tenant, TenantListItem } from '@/lib/types';

interface TenantContextValue {
  groupId: string | null;
  tenant: Tenant | null;
  accessibleTenants: TenantListItem[];
  isPlatformStaff: boolean;
  setGroupId: (groupId: string) => void;
  refreshTenant: () => Promise<void>;
  refreshTenants: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { staff, api } = useAuth();
  const [groupId, setGroupIdState] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accessibleTenants, setAccessibleTenants] = useState<TenantListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlatformStaff = staff?.casinoGroupId == null;

  const refreshTenants = useCallback(async () => {
    if (!api || !isPlatformStaff) {
      setAccessibleTenants([]);
      return;
    }
    try {
      setAccessibleTenants(await api.listTenants());
    } catch (err) {
      setAccessibleTenants([]);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    }
  }, [api, isPlatformStaff]);

  const refreshTenant = useCallback(async () => {
    if (!api || !groupId) {
      setTenant(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTenant(await api.getTenant(groupId));
    } catch (err) {
      setTenant(null);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [api, groupId]);

  useEffect(() => {
    if (!staff) {
      setGroupIdState(null);
      setTenant(null);
      setAccessibleTenants([]);
      return;
    }
    if (staff.casinoGroupId) {
      setGroupIdState(staff.casinoGroupId);
    } else {
      const saved = loadTenantGroupId();
      setGroupIdState(saved);
    }
    void refreshTenants();
  }, [staff, refreshTenants]);

  useEffect(() => {
    if (!isPlatformStaff || accessibleTenants.length === 0) {
      return;
    }
    if (groupId && accessibleTenants.some((t) => t.id === groupId)) {
      return;
    }
    const first = accessibleTenants[0]?.id;
    if (first) {
      setGroupIdState(first);
      saveTenantGroupId(first);
    }
  }, [accessibleTenants, groupId, isPlatformStaff]);

  useEffect(() => {
    void refreshTenant();
  }, [refreshTenant]);

  const setGroupId = useCallback((next: string) => {
    const trimmed = next.trim();
    setGroupIdState(trimmed || null);
    if (trimmed) {
      saveTenantGroupId(trimmed);
    }
  }, []);

  const value = useMemo(
    () => ({
      groupId,
      tenant,
      accessibleTenants,
      isPlatformStaff,
      setGroupId,
      refreshTenant,
      refreshTenants,
      loading,
      error,
    }),
    [
      groupId,
      tenant,
      accessibleTenants,
      isPlatformStaff,
      setGroupId,
      refreshTenant,
      refreshTenants,
      loading,
      error,
    ],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
}
