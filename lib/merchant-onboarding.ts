/** Suggested launch-JWT merchant id; matches API default ({slug}-merchant). */
export function suggestMerchantId(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return normalized.length > 0 ? `${normalized}-merchant` : '';
}
