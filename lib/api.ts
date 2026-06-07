import { API_BASE } from './config';
import type {
  AnalyticsSummary,
  AuditEntry,
  Bet,
  BetExceptionQueue,
  DailyGgrReport,
  TradableMarket,
  CreateMerchantBody,
  CreateMerchantResponse,
  OperatorStaffAccount,
  PlatformAdminRow,
  ExposureSummary,
  TenantListItem,
  LeagueOffering,
  RiskLimits,
  StaffLoginResponse,
  SettlementRunResult,
  StaffProfile,
  Tenant,
  UnsettledEvent,
} from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    // ignore
  }
  return response.statusText || 'Request failed';
}

export async function staffLogin(
  email: string,
  password: string,
): Promise<StaffLoginResponse> {
  const response = await fetch(buildUrl('/backoffice/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }
  return response.json() as Promise<StaffLoginResponse>;
}

export async function staffLogout(refreshToken: string): Promise<void> {
  await fetch(buildUrl('/backoffice/auth/logout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
}

export async function staffRefresh(
  refreshToken: string,
): Promise<StaffLoginResponse> {
  const response = await fetch(buildUrl('/backoffice/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }
  return response.json() as Promise<StaffLoginResponse>;
}

export function createBackofficeClient(accessToken: string) {
  async function request<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const response = await fetch(buildUrl(path, params), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new ApiError(response.status, await parseError(response));
    }
    return response.json() as Promise<T>;
  }

  async function patch<T>(
    path: string,
    body: unknown,
    params?: Record<string, string | undefined>,
  ): Promise<T> {
    const response = await fetch(buildUrl(path, params), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new ApiError(response.status, await parseError(response));
    }
    return response.json() as Promise<T>;
  }

  async function put<T>(
    path: string,
    body: unknown,
    params?: Record<string, string | undefined>,
  ): Promise<T> {
    const response = await fetch(buildUrl(path, params), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new ApiError(response.status, await parseError(response));
    }
    return response.json() as Promise<T>;
  }

  async function post<T>(
    path: string,
    body?: unknown,
    params?: Record<string, string | undefined>,
  ): Promise<T> {
    const response = await fetch(buildUrl(path, params), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new ApiError(response.status, await parseError(response));
    }
    return response.json() as Promise<T>;
  }

  function withGroup(
    casinoGroupId: string,
    params: Record<string, string | number | undefined> = {},
  ) {
    return { ...params, casinoGroupId };
  }

  return {
    getMe: () => request<StaffProfile>('/backoffice/staff/me'),
    listTenants: () => request<TenantListItem[]>('/backoffice/tenants'),
    listPlatformAdmins: () =>
      request<PlatformAdminRow[]>('/backoffice/staff/platform-admins'),
    setPlatformAdminTenantAccess: (staffUserId: string, casinoGroupIds: string[]) =>
      put<PlatformAdminRow>(
        `/backoffice/staff/${staffUserId}/tenant-access`,
        { casinoGroupIds },
      ),
    getTenant: (casinoGroupId: string) =>
      request<Tenant>('/backoffice/tenant', withGroup(casinoGroupId)),
    patchTenant: (
      casinoGroupId: string,
      body: Partial<Pick<Tenant, 'name' | 'defaultCurrency' | 'timezone' | 'status'>>,
    ) => patch<Tenant>('/backoffice/tenant', body, withGroup(casinoGroupId)),
    listLeagues: (casinoGroupId: string) =>
      request<LeagueOffering[]>(
        '/backoffice/product/leagues',
        withGroup(casinoGroupId),
      ),
    updateLeagues: (
      casinoGroupId: string,
      leagues: { leagueId: string; enabled: boolean }[],
    ) =>
      put<LeagueOffering[]>(
        '/backoffice/product/leagues',
        { leagues },
        withGroup(casinoGroupId),
      ),
    getTradableMarkets: (casinoGroupId: string) =>
      request<TradableMarket[]>(
        '/backoffice/trading/markets',
        withGroup(casinoGroupId),
      ),
    getExposure: (casinoGroupId: string) =>
      request<ExposureSummary>(
        '/backoffice/trading/exposure',
        withGroup(casinoGroupId),
      ),
    getLimits: (casinoGroupId: string) =>
      request<RiskLimits>(
        '/backoffice/trading/limits',
        withGroup(casinoGroupId),
      ),
    patchLimits: (
      casinoGroupId: string,
      body: { minStake?: string; maxStake?: string; maxPayout?: string },
    ) =>
      patch<RiskLimits>(
        '/backoffice/trading/limits',
        body,
        withGroup(casinoGroupId),
      ),
    suspendEvent: (casinoGroupId: string, eventId: string, reason: string) =>
      post(
        `/backoffice/trading/events/${eventId}/suspend`,
        { reason },
        withGroup(casinoGroupId),
      ),
    suspendMarket: (casinoGroupId: string, marketId: string, reason: string) =>
      post(
        `/backoffice/trading/markets/${marketId}/suspend`,
        { reason },
        withGroup(casinoGroupId),
      ),
    resumeMarket: (casinoGroupId: string, marketId: string) =>
      post(
        `/backoffice/trading/markets/${marketId}/resume`,
        undefined,
        withGroup(casinoGroupId),
      ),
    listBetExceptions: (casinoGroupId: string) =>
      request<BetExceptionQueue>(
        '/backoffice/bets/exceptions',
        withGroup(casinoGroupId),
      ),
    searchBets: (
      casinoGroupId: string,
      params?: {
        userId?: string;
        status?: string;
        eventId?: string;
        limit?: number;
      },
    ) => request<Bet[]>('/backoffice/bets', withGroup(casinoGroupId, params)),
    getBet: (casinoGroupId: string, betId: string) =>
      request<Bet>(`/backoffice/bets/${betId}`, withGroup(casinoGroupId)),
    voidBet: (casinoGroupId: string, betId: string, reason: string) =>
      post<Bet>(
        `/backoffice/bets/${betId}/void`,
        { reason },
        withGroup(casinoGroupId),
      ),
    listUnsettledEvents: (casinoGroupId: string) =>
      request<UnsettledEvent[]>(
        '/backoffice/settlement/events',
        withGroup(casinoGroupId),
      ),
    runEventSettlement: (casinoGroupId: string, eventId: string) =>
      post<SettlementRunResult>(
        `/backoffice/settlement/events/${eventId}/run`,
        undefined,
        withGroup(casinoGroupId),
      ),
    applyEventResult: (
      casinoGroupId: string,
      eventId: string,
      body: { homeScore: number; awayScore: number },
    ) =>
      post<SettlementRunResult>(
        `/backoffice/settlement/events/${eventId}/result`,
        body,
        withGroup(casinoGroupId),
      ),
    applyProviderResult: (
      casinoGroupId: string,
      body: { providerRef: string; homeScore: number; awayScore: number },
    ) =>
      post<SettlementRunResult>(
        '/backoffice/settlement/events/by-provider-ref/result',
        body,
        withGroup(casinoGroupId),
      ),
    getAnalyticsSummary: (casinoGroupId: string) =>
      request<AnalyticsSummary>(
        '/backoffice/analytics/summary',
        withGroup(casinoGroupId),
      ),
    getDailyGgr: (casinoGroupId: string, days = 7) =>
      request<DailyGgrReport>(
        '/backoffice/analytics/daily',
        withGroup(casinoGroupId, { days }),
      ),
    searchAudit: (
      casinoGroupId: string | undefined,
      params?: { action?: string; limit?: number },
    ) =>
      request<AuditEntry[]>(
        '/backoffice/compliance/audit',
        casinoGroupId ? { casinoGroupId, ...params } : params,
      ),
    exportAudit: async (
      casinoGroupId: string | undefined,
      params?: { action?: string; format?: 'json' | 'csv'; limit?: number },
    ) => {
      const response = await fetch(
        buildUrl(
          '/backoffice/compliance/audit/export',
          casinoGroupId
            ? {
                casinoGroupId,
                action: params?.action,
                format: params?.format ?? 'csv',
                limit: params?.limit,
              }
            : {
                action: params?.action,
                format: params?.format ?? 'csv',
                limit: params?.limit,
              },
        ),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        },
      );
      if (!response.ok) {
        throw new ApiError(response.status, await parseError(response));
      }
      if ((params?.format ?? 'csv') === 'csv') {
        return response.text();
      }
      return response.json();
    },
    createMerchant: (body: CreateMerchantBody) =>
      post<CreateMerchantResponse>('/backoffice/merchants', body),
    listOperatorAdmins: (casinoGroupId: string) =>
      request<OperatorStaffAccount[]>(
        '/backoffice/staff/operators',
        withGroup(casinoGroupId),
      ),
    updateOperatorAdmin: (
      casinoGroupId: string,
      staffUserId: string,
      body: { email?: string; password?: string },
    ) =>
      patch<{ id: string; email: string; roles: string[]; status: string }>(
        `/backoffice/staff/operators/${staffUserId}`,
        body,
        withGroup(casinoGroupId),
      ),
  };
}
