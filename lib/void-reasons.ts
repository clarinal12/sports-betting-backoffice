export const VOID_REASON_CODES = [
  { code: 'customer_request', label: 'Customer request' },
  { code: 'duplicate_bet', label: 'Duplicate bet' },
  { code: 'palpable_error', label: 'Palpable error / wrong price' },
  { code: 'event_cancelled', label: 'Event cancelled' },
  { code: 'fraud_review', label: 'Fraud or compliance review' },
  { code: 'other', label: 'Other (add note)' },
] as const;

export function isVoidNoteRequired(code: string): boolean {
  return code === 'other';
}

export function validateVoidReason(code: string, note: string): string | null {
  if (isVoidNoteRequired(code) && note.trim().length === 0) {
    return 'A note is required when the reason is Other.';
  }
  return null;
}

export function formatVoidReason(code: string, note: string): string {
  const preset = VOID_REASON_CODES.find((item) => item.code === code);
  const base = preset ? `${preset.code}: ${preset.label}` : code;
  const trimmed = note.trim();
  return trimmed.length > 0 ? `${base} — ${trimmed}` : base;
}
