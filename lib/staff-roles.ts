import type { StaffProfile } from './types';

/** Platform-scoped staff (SUPER_ADMIN / PLATFORM_ADMIN). */
export function isPlatformStaff(staff: StaffProfile | null | undefined): boolean {
  return staff?.casinoGroupId == null;
}

/** SUPER_ADMIN or PLATFORM_ADMIN — may edit tenant currency, timezone, and status. */
export function canEditTenantPlatformFields(
  staff: StaffProfile | null | undefined,
): boolean {
  if (!staff) {
    return false;
  }
  return (
    staff.roles.includes('SUPER_ADMIN') ||
    staff.roles.includes('PLATFORM_ADMIN')
  );
}

/** Tenant-bound merchant operator (OPERATOR_ADMIN). */
export function isTenantOperator(staff: StaffProfile | null | undefined): boolean {
  if (!staff?.casinoGroupId) {
    return false;
  }
  return staff.roles.includes('OPERATOR_ADMIN');
}
