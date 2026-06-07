/** Suggested launch-JWT merchant id; matches API default ({slug}-merchant). */
export function suggestMerchantId(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return normalized.length > 0 ? `${normalized}-merchant` : '';
}

/** Suggested OPERATOR_ADMIN login email; matches API default. */
export function suggestOperatorEmail(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return normalized.length > 0 ? `admin@${normalized}.merchant.local` : '';
}
