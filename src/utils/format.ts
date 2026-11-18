/**
 * Deterministic number formatting for Next.js SSR & client hydration consistency.
 * Explicitly locks locale to 'en-IN' for Indian Rupee numbering format (e.g. 1,23,456).
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-IN", options).format(value);
}

export function formatCurrency(
  value: number,
  maximumFractionDigits = 0
): string {
  return `₹${formatNumber(value, { maximumFractionDigits })}`;
}
