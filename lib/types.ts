export interface StaffProfile {
  id: string;
  email: string;
  casinoGroupId: string | null;
  roles: string[];
  permissions: string[];
}

export interface StaffLoginResponse {
  accessToken: string;
  expiresIn: string;
  refreshToken: string;
  refreshExpiresIn: string;
  staff: StaffProfile;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
  status: string;
  merchantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export interface PlatformAdminRow {
  id: string;
  email: string;
  roles: string[];
  status: string;
  casinoGroups: TenantListItem[];
}

export interface LeagueOffering {
  leagueId: string;
  key: string;
  name: string;
  region: string | null;
  sportKey: string;
  sportName: string;
  enabled: boolean;
}

export interface ExposureSummary {
  casinoGroupId: string;
  openBetCount: number;
  currency: string | null;
  totalStake: string;
  totalPotentialPayout: string;
  byEvent: {
    eventId: string;
    legCount: number;
    stake: string;
    potentialPayout: string;
  }[];
}

export interface RiskLimits {
  casinoGroupId: string;
  scope: string;
  minStake: string | null;
  maxStake: string | null;
  maxPayout: string | null;
}

export interface BetLeg {
  selectionId: string;
  marketId: string;
  eventId: string;
  selectionName: string;
  priceAtPlacement: string;
  outcome: string | null;
  marketType: string | null;
  marketLine: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  eventProviderRef: string | null;
}

export interface Bet {
  id: string;
  userId?: string;
  status: string;
  stake: string;
  currency: string;
  combinedOdds: string;
  potentialPayout: string;
  payoutAmount: string | null;
  settledAt: string | null;
  rejectionReason: string | null;
  settlementNote: string | null;
  createdAt: string;
  legs: BetLeg[];
  walletReservationId?: string | null;
  idempotencyKey?: string | null;
}

export interface UnsettledEvent {
  eventId: string;
  providerRef: string;
  eventStatus: string;
  homeScore: number | null;
  awayScore: number | null;
  matchup: string;
  marketStatus: string | null;
  openBetCount: number;
  blockers: string[];
  readyToSettle: boolean;
}

export interface SettlementRunResult {
  eventId: string;
  settled: number;
  attempted: number;
  remainingOpenBets: number;
  homeScore?: number;
  awayScore?: number;
}

export interface AnalyticsSummary {
  casinoGroupId: string;
  byStatus: Record<
    string,
    { count: number; stake: string; payout: string }
  >;
  openLiability: { betCount: number; stake: string };
  ggr: { settledStake: string; payouts: string; gross: string };
}

export interface AuditEntry {
  id: string;
  actorType: string;
  actorId: string;
  casinoGroupId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
}

export interface CreateMerchantBody {
  slug: string;
  name: string;
  merchantId?: string;
  defaultCurrency?: string;
  timezone?: string;
  leagueKeys?: string[];
}

export interface CreateMerchantResponse {
  id: string;
  slug: string;
  name: string;
  merchantId: string;
  defaultCurrency: string;
  status: string;
  sportsSecret: string;
  enabledLeagueKeys: string[];
}
