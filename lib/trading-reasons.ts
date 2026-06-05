export const SUSPEND_REASON_CODES = [
  { code: 'risk_spike', label: 'Liability spike' },
  { code: 'suspected_error', label: 'Suspected pricing error' },
  { code: 'injury_news', label: 'Late team/news' },
  { code: 'provider_issue', label: 'Feed or provider issue' },
  { code: 'compliance', label: 'Compliance hold' },
  { code: 'other', label: 'Other' },
] as const;

export function formatSuspendReason(code: string, note: string): string {
  const preset = SUSPEND_REASON_CODES.find((item) => item.code === code);
  const base = preset ? `${preset.code}: ${preset.label}` : code;
  const trimmed = note.trim();
  return trimmed.length > 0 ? `${base} — ${trimmed}` : base;
}
