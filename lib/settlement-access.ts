import type { StaffProfile } from './types';
import { hasPermission } from './permissions';

const PLATFORM_SETTLEMENT_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN']);

export function isPlatformSettlementRole(staff: StaffProfile | null): boolean {
  if (!staff || staff.casinoGroupId != null) {
    return false;
  }
  return staff.roles.some((role) => PLATFORM_SETTLEMENT_ROLES.has(role));
}

export function canRunSettlement(staff: StaffProfile | null): boolean {
  return (
    isPlatformSettlementRole(staff) &&
    hasPermission(staff?.permissions ?? [], 'settlement.run')
  );
}

export function needsSettlementRelogin(staff: StaffProfile | null): boolean {
  return (
    isPlatformSettlementRole(staff) &&
    !hasPermission(staff?.permissions ?? [], 'settlement.run')
  );
}
