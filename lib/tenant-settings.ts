export const TENANT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
] as const;

export const TENANT_CURRENCY_OPTIONS = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'JPY',
  'CNY',
  'HKD',
  'SGD',
  'INR',
  'PHP',
  'THB',
  'MYR',
  'IDR',
  'VND',
  'KRW',
  'ZAR',
  'NGN',
  'KES',
  'TRY',
] as const;

export const TENANT_TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Warsaw',
  'Europe/Athens',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Manila',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

function withCurrentOption(options: readonly string[], current?: string): string[] {
  if (!current || options.includes(current)) {
    return [...options];
  }
  return [current, ...options];
}

export function currencyOptions(current?: string): string[] {
  return withCurrentOption(TENANT_CURRENCY_OPTIONS, current);
}

export function timezoneOptions(current?: string): string[] {
  return withCurrentOption(TENANT_TIMEZONE_OPTIONS, current);
}
