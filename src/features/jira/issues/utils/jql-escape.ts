/**
 * Escape a value embedded inside JQL double-quoted string literals.
 * Matches {@link buildJQLFromHelpers} text search escaping in search-issues.use-case.
 */
export function escapeJqlQuotedLiteral(value: string): string {
  return value.replace(/"/g, String.raw`\"`);
}
