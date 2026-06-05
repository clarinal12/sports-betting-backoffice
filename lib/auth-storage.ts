import type { StaffProfile } from './types';

const ACCESS_KEY = 'bo_access_token';
const REFRESH_KEY = 'bo_refresh_token';
const STAFF_KEY = 'bo_staff_profile';
const TENANT_KEY = 'bo_tenant_group_id';

export function loadAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACCESS_KEY);
}

export function loadRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(REFRESH_KEY);
}

export function loadStaff(): StaffProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StaffProfile;
  } catch {
    return null;
  }
}

export function saveSession(
  accessToken: string,
  refreshToken: string,
  staff: StaffProfile,
): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  if (staff.casinoGroupId) {
    localStorage.setItem(TENANT_KEY, staff.casinoGroupId);
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STAFF_KEY);
}

export function loadTenantGroupId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(TENANT_KEY);
}

export function saveTenantGroupId(groupId: string): void {
  localStorage.setItem(TENANT_KEY, groupId);
}
