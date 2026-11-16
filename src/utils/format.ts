/**
 * Deterministic number formatting for Next.js SSR & client hydration consistency.
 * Explicitly locks locale to 'en-US' so Node.js server and client browsers (en-IN, etc.)
 * produce identical number strings without hydration mismatches.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatCurrency(
  value: number,
  maximumFractionDigits = 0
): string {
  return `$${formatNumber(value, { maximumFractionDigits })}`;
}
