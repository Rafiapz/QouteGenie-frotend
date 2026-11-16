import { Quotation, QuoteComparisonRecord } from "@/types/quotation";

const STORAGE_KEY = "quotegenie_comparisons";
const ACTIVE_COMPARISON_KEY = "quotegenie_active_comparison_id";

export function getLocalStoredComparisons(): QuoteComparisonRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalStoredComparisons(
  records: QuoteComparisonRecord[],
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save comparisons to localStorage:", e);
  }
}

export function getActiveComparisonId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_COMPARISON_KEY);
}

export function setActiveComparisonId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(ACTIVE_COMPARISON_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_COMPARISON_KEY);
  }
}

export function removeComparisonFromLocalCache(comparisonId: string): QuoteComparisonRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getLocalStoredComparisons();
    const updated = current.filter((c) => c.id !== comparisonId);
    saveLocalStoredComparisons(updated);

    if (getActiveComparisonId() === comparisonId) {
      setActiveComparisonId(null);
    }

    // Clean any comparison-specific cache entries from storage
    try {
      localStorage.removeItem(`quotegenie_analysis_${comparisonId}`);
      localStorage.removeItem(`comparison_${comparisonId}`);
      sessionStorage.removeItem(`quotegenie_analysis_${comparisonId}`);
      sessionStorage.removeItem(`comparison_${comparisonId}`);
    } catch {}

    return updated;
  } catch (e) {
    console.warn("Failed to remove comparison from cache:", e);
    return [];
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trimEnd() + "…";
}

export function generateDefaultComparisonName(quotes: Quotation[]): string {
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (quotes.length === 2) {
    const s1 = truncateText(quotes[0].supplierName, 22);
    const s2 = truncateText(quotes[1].supplierName, 22);
    return `${s1} vs ${s2} (${dateStr})`;
  } else if (quotes.length > 2) {
    const s1 = truncateText(quotes[0].supplierName, 18);
    const s2 = truncateText(quotes[1].supplierName, 18);
    return `${s1} vs ${s2} +${quotes.length - 2} (${dateStr})`;
  } else if (quotes.length === 1) {
    const s1 = truncateText(quotes[0].supplierName, 25);
    return `${s1} Benchmark (${dateStr})`;
  }
  return `Quotation Comparison (${dateStr})`;
}
