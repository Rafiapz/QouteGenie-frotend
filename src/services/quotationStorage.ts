import { Quotation } from "@/types/quotation";

const STORAGE_KEY = "quotegenie_stored_quotations";

export function getStoredQuotations(): Quotation[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed: Quotation[] = JSON.parse(stored);
    // Filter out any legacy sample quotes if previously cached in the browser
    const filtered = parsed.filter(
      (q) =>
        !q.id.startsWith("quote-sample-") &&
        q.id !== "quote-sample-01" &&
        q.id !== "quote-sample-02" &&
        q.id !== "quote-sample-03" &&
        q.quoteNumber !== "QTE-2026-8812" &&
        q.quoteNumber !== "VND-44910" &&
        q.quoteNumber !== "Q-99341"
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export function saveQuotation(quote: Quotation): Quotation[] {
  if (typeof window === "undefined") return [];
  const current = getStoredQuotations();
  const existingIdx = current.findIndex((q) => q.id === quote.id);

  let updated: Quotation[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = quote;
  } else {
    updated = [quote, ...current];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteQuotation(id: string): Quotation[] {
  if (typeof window === "undefined") return [];
  const current = getStoredQuotations();
  const updated = current.filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearStoredQuotations(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
