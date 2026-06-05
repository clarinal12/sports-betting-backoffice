export function hasPermission(
  permissions: readonly string[],
  required: string,
): boolean {
  return permissions.includes(required);
}
