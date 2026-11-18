"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  SparklesIcon,
  CheckIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  UploadCloudIcon,
  CopyIcon,
  AlertTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  FolderIcon,
  TrophyIcon,
  AwardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CurrencyDollarIcon,
  MailIcon,
  DocumentTextIcon,
  EyeIcon,
  XIcon,
  PlusIcon,
  ScaleIcon,
} from "@/components/Icons";
import {
  analyzeQuotesWithAi,
  analyzeComparisonWithAi,
  getComparisonsFromApi,
  createComparisonInApi,
  updateComparisonInApi,
  IntelligentAnalysisResult,
  RiskItem,
} from "@/services/api";
import { Quotation, QuoteComparisonRecord } from "@/types/quotation";
import {
  getLocalStoredComparisons,
  saveLocalStoredComparisons,
  generateDefaultComparisonName,
} from "@/services/comparisonStorage";
import { formatCurrency } from "@/utils/format";
import PlanLimitModal from "@/components/common/PlanLimitModal";

function normalizeTextToRupees(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/\b(?:EUR|USD|GBP)\s*([0-9,]+(?:\.[0-9]+)?)/gi, "₹$1")
    .replace(/[$€£]\s*([0-9,]+(?:\.[0-9]+)?)/g, "₹$1")
    .replace(/\b(?:EUR|USD|GBP)\b/gi, "₹")
    .replace(/[$€£]/g, "₹");
}

function sanitizeAnalysisCurrencies(res: IntelligentAnalysisResult | null): IntelligentAnalysisResult | null {
  if (!res) return null;
  return {
    ...res,
    summary: normalizeTextToRupees(res.summary),
    recommendationReason: normalizeTextToRupees(res.recommendationReason),
    strategicActionPlan: (res.strategicActionPlan || []).map(normalizeTextToRupees),
    splitSourcing: res.splitSourcing
      ? {
          ...res.splitSourcing,
          summary: normalizeTextToRupees(res.splitSourcing.summary),
          allocations: (res.splitSourcing.allocations || []).map((a) => ({
            ...a,
            itemDescription: normalizeTextToRupees(a.itemDescription),
          })),
        }
      : res.splitSourcing,
    riskAnalysis: (res.riskAnalysis || []).map((r) => ({
      ...r,
      title: normalizeTextToRupees(r.title),
      description: normalizeTextToRupees(r.description),
    })),
    negotiationPoints: (res.negotiationPoints || []).map((n) => ({
      ...n,
      leveragePoint: normalizeTextToRupees(n.leveragePoint),
      recommendedAction: normalizeTextToRupees(n.recommendedAction),
      potentialImpact: normalizeTextToRupees(n.potentialImpact),
      draftEmailSnippet: normalizeTextToRupees(n.draftEmailSnippet),
    })),
    supplierScores: (res.supplierScores || []).map((s) => ({
      ...s,
      strengths: (s.strengths || []).map(normalizeTextToRupees),
      weaknesses: (s.weaknesses || []).map(normalizeTextToRupees),
    })),
  };
}

interface IntelligentQuoteAnalysisViewProps {
  allQuotations: Quotation[];
  comparisons?: QuoteComparisonRecord[];
  onComparisonsChange?: (comparisons: QuoteComparisonRecord[]) => void;
  scopedQuoteIds?: string[];
  initialComparisonId?: string | null;
  onOpenUpload: () => void;
  onComparisonChange?: (comparisonId: string | null) => void;
}

type TabKey = "scorecards" | "risks";

export function IntelligentQuoteAnalysisView({
  allQuotations,
  comparisons: propComparisons,
  onComparisonsChange,
  scopedQuoteIds,
  initialComparisonId = null,
  onOpenUpload,
  onComparisonChange,
}: IntelligentQuoteAnalysisViewProps) {
  const [analysis, setAnalysis] = useState<IntelligentAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database comparisons state
  const [localComparisons, setLocalComparisons] = useState<QuoteComparisonRecord[]>(() => {
    return propComparisons && propComparisons.length > 0
      ? propComparisons
      : getLocalStoredComparisons();
  });

  const comparisons = propComparisons && propComparisons.length > 0
    ? propComparisons
    : localComparisons;

  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(() => {
    if (initialComparisonId) return initialComparisonId;
    const comps =
      propComparisons && propComparisons.length > 0
        ? propComparisons
        : getLocalStoredComparisons();
    return comps.length > 0 ? comps[0].id : null;
  });

  // Active view tab & filters
  const [activeTab, setActiveTab] = useState<TabKey>("scorecards");
  const [riskSeverityFilter, setRiskSeverityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activePreviewQuote, setActivePreviewQuote] = useState<Quotation | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAddQuotesModal, setShowAddQuotesModal] = useState(false);
  const [modalAddQuoteIds, setModalAddQuoteIds] = useState<string[]>([]);
  const [isUpdatingComparison, setIsUpdatingComparison] = useState(false);

  // Create comparison modal state (used when no comparisons exist or from empty states)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newModalName, setNewModalName] = useState("");
  const [newModalQuoteIds, setNewModalQuoteIds] = useState<string[]>([]);
  const [isCreatingComparison, setIsCreatingComparison] = useState(false);
  const [planLimitModal, setPlanLimitModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    limitType: "comparisons" | "quotes_per_comparison" | "generic";
  }>({
    isOpen: false,
    message: "",
    limitType: "generic",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Fetch saved comparisons from API only if not supplied by parent
  useEffect(() => {
    if (propComparisons && propComparisons.length > 0) return;

    getComparisonsFromApi()
      .then((records) => {
        if (Array.isArray(records)) {
          setLocalComparisons(records);
          saveLocalStoredComparisons(records);
        }
      })
      .catch((err) => {
        console.warn("Could not load comparisons for AI view:", err);
      });
  }, [propComparisons]);

  // Match scopedQuoteIds or auto-select first comparison if available
  useEffect(() => {
    if (initialComparisonId !== undefined && initialComparisonId !== null && initialComparisonId !== "") {
      setSelectedComparisonId(initialComparisonId);
    } else if (scopedQuoteIds && scopedQuoteIds.length >= 2) {
      const sortedScope = [...scopedQuoteIds].sort().join(",");
      const match = comparisons.find(
        (r) => [...(r.quoteIds || [])].sort().join(",") === sortedScope
      );
      if (match) {
        setSelectedComparisonId(match.id);
      }
    } else if (comparisons.length > 0) {
      if (!selectedComparisonId || (!comparisons.some((c) => c.id === selectedComparisonId) && selectedComparisonId !== "all")) {
        const firstId = comparisons[0].id;
        setSelectedComparisonId(firstId);
        onComparisonChange?.(firstId);
      }
    } else {
      setSelectedComparisonId(null);
    }
  }, [initialComparisonId, scopedQuoteIds, comparisons, selectedComparisonId, onComparisonChange]);

  // Lookup the currently selected comparison record
  const selectedComparison = useMemo(() => {
    if (!selectedComparisonId) return null;
    return comparisons.find((c) => c.id === selectedComparisonId) || null;
  }, [selectedComparisonId, comparisons]);

  // Active quotes in the current comparison scope
  const activeQuotes = useMemo(() => {
    if (selectedComparison) {
      return allQuotations.filter((q) =>
        selectedComparison.quoteIds.includes(q.id)
      );
    }
    if (scopedQuoteIds && scopedQuoteIds.length > 0) {
      return allQuotations.filter((q) => scopedQuoteIds.includes(q.id));
    }
    return allQuotations;
  }, [selectedComparison, scopedQuoteIds, allQuotations]);

  // Unique signature for the current comparison quotation set
  const currentScopeQuotesKey = useMemo(() => {
    if (selectedComparison) {
      const sortedQuoteIds = [...(selectedComparison.quoteIds || [])].sort().join(",");
      return `${selectedComparison.id}:${sortedQuoteIds}`;
    }
    if (selectedComparisonId === "all") {
      const sortedAll = allQuotations.map((q) => q.id).sort().join(",");
      return `all:${sortedAll}`;
    }
    if (scopedQuoteIds && scopedQuoteIds.length > 0) {
      return `scoped:${[...scopedQuoteIds].sort().join(",")}`;
    }
    return null;
  }, [selectedComparison, selectedComparisonId, scopedQuoteIds, allQuotations]);

  // Track the last analyzed key, comparison ID, and quote set to detect creation and updates
  const lastAnalyzedKeyRef = useRef<string | null>(null);
  const prevComparisonIdRef = useRef<string | null>(null);
  const prevQuoteIdsRef = useRef<string | null>(null);

  // Supplier names in active scope
  const activeSupplierNames = useMemo(() => {
    const names = Array.from(new Set(activeQuotes.map((q) => q.supplierName)));
    return names.length > 0 ? names.join(", ") : "All Suppliers";
  }, [activeQuotes]);

  // 2. Fetch or trigger AI analysis for the selected scope
  const fetchAnalysisForScope = async (
    targetComparisonId: string | null = selectedComparisonId,
    forceRefresh: boolean = false
  ) => {
    if (allQuotations.length === 0) return;

    setIsLoading(true);
    setError(null);
    if (forceRefresh) {
      setAnalysis(null);
    }

    try {
      let result: IntelligentAnalysisResult;

      if (targetComparisonId && targetComparisonId !== "all") {
        // Use comparison-specific analysis endpoint, passing active comparison quote IDs
        const targetComp = comparisons.find((c) => c.id === targetComparisonId) || selectedComparison;
        const targetQuoteIds = targetComp?.quoteIds && targetComp.quoteIds.length > 0
          ? targetComp.quoteIds
          : activeQuotes.map((q) => q.id);
        result = await analyzeComparisonWithAi(targetComparisonId, forceRefresh, targetQuoteIds);
      } else if (scopedQuoteIds && scopedQuoteIds.length > 0) {
        // Use scoped quote IDs
        result = await analyzeQuotesWithAi(scopedQuoteIds, forceRefresh);
      } else {
        // Analyze all quotations
        result = await analyzeQuotesWithAi(undefined, forceRefresh);
      }

      setAnalysis(sanitizeAnalysisCurrencies(result));
    } catch (err: any) {
      console.error("Failed to run AI analysis for scope:", err);
      setError(
        err.message || "Failed to generate intelligent AI quotation analysis."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically run AI analysis: forceRefresh is TRUE ONLY when creating or updating, otherwise FALSE
  useEffect(() => {
    if (!currentScopeQuotesKey || allQuotations.length === 0) return;

    if (lastAnalyzedKeyRef.current !== currentScopeQuotesKey) {
      const currentQuoteIds = selectedComparison
        ? [...(selectedComparison.quoteIds || [])].sort().join(",")
        : scopedQuoteIds ? [...scopedQuoteIds].sort().join(",") : "";

      // Check if this is an update to the quotations of the current comparison
      const isQuoteUpdate = Boolean(
        prevComparisonIdRef.current !== null &&
        prevComparisonIdRef.current === selectedComparisonId &&
        prevQuoteIdsRef.current !== null &&
        prevQuoteIdsRef.current !== currentQuoteIds
      );

      // Check if this is a newly created comparison (created in last 12 seconds)
      const isNewlyCreated = Boolean(
        selectedComparison?.createdAt &&
        Math.abs(Date.now() - new Date(selectedComparison.createdAt).getTime()) < 12000
      );

      // forceRefresh is true ONLY when creating or updating; otherwise false (e.g. switching comparisons or viewing)
      const shouldForceRefresh = isQuoteUpdate || isNewlyCreated;

      lastAnalyzedKeyRef.current = currentScopeQuotesKey;
      prevComparisonIdRef.current = selectedComparisonId;
      prevQuoteIdsRef.current = currentQuoteIds;

      fetchAnalysisForScope(selectedComparisonId, shouldForceRefresh);
    }
  }, [currentScopeQuotesKey, selectedComparisonId, allQuotations.length, selectedComparison, scopedQuoteIds]);

  // Switch comparison scope
  const handleSelectScope = (id: string | null) => {
    setSelectedComparisonId(id);
    onComparisonChange?.(id);
    if (id) {
      fetchAnalysisForScope(id, false);
    } else {
      setAnalysis(null);
    }
  };

  // Open modal to add/remove quotes from current comparison
  const handleOpenAddQuotesModal = () => {
    if (!selectedComparison) return;
    setModalAddQuoteIds(selectedComparison.quoteIds || activeQuotes.map((q) => q.id));
    setShowAddQuotesModal(true);
  };

  // Confirm updating quotations in active comparison
  const handleConfirmAddQuotes = async () => {
    if (!selectedComparison || modalAddQuoteIds.length < 2) return;
    if (modalAddQuoteIds.length > 3) {
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Limit Exceeded",
        message: "You can only compare up to 3 quotations at a time on the Free plan.",
        limitType: "quotes_per_comparison",
      });
      return;
    }
    setIsUpdatingComparison(true);
    try {
      const updated = await updateComparisonInApi(selectedComparison.id, {
        quoteIds: modalAddQuoteIds,
      });
      const updatedList = comparisons.map((c) =>
        c.id === updated.id ? updated : c
      );
      setLocalComparisons(updatedList);
      saveLocalStoredComparisons(updatedList);
      onComparisonsChange?.(updatedList);
      setShowAddQuotesModal(false);

      // Force fresh AI audit with the newly updated quote(s)
      const sortedQuoteIds = [...modalAddQuoteIds].sort().join(",");
      lastAnalyzedKeyRef.current = `${updated.id}:${sortedQuoteIds}`;
      prevComparisonIdRef.current = updated.id;
      prevQuoteIdsRef.current = sortedQuoteIds;
      fetchAnalysisForScope(selectedComparison.id, true);
    } catch (err: any) {
      alert(err.message || "Failed to update comparison quotations.");
    } finally {
      setIsUpdatingComparison(false);
    }
  };

  // Quick creation of comparison for all available quotations (prompts for comparison name)
  const handleQuickCreateAllComparison = () => {
    if (allQuotations.length < 2) return;
    if (comparisons.length >= 3) {
      setPlanLimitModal({
        isOpen: true,
        title: "Comparison Limit Reached",
        message: "You have reached the maximum limit of 3 comparisons on the Free plan. To create a new comparison, please delete an existing one or upgrade your account.",
        limitType: "comparisons",
      });
      return;
    }
    const targetQuotes = allQuotations.slice(0, 3);
    setNewModalQuoteIds(targetQuotes.map((q) => q.id));
    setNewModalName(generateDefaultComparisonName(targetQuotes));
    setShowCreateModal(true);
  };

  // Open modal to create custom comparison
  const handleOpenCreateCustomModal = () => {
    if (comparisons.length >= 3) {
      setPlanLimitModal({
        isOpen: true,
        title: "Comparison Limit Reached",
        message: "You have reached the maximum limit of 3 comparisons on the Free plan. To create a new comparison, please delete an existing one or upgrade your account.",
        limitType: "comparisons",
      });
      return;
    }
    const initialQuotes = allQuotations.slice(0, Math.min(allQuotations.length, 3));
    setNewModalQuoteIds(initialQuotes.map((q) => q.id));
    setNewModalName(generateDefaultComparisonName(initialQuotes));
    setShowCreateModal(true);
  };

  // Confirm custom comparison creation
  const handleConfirmCreateCustom = async () => {
    if (newModalQuoteIds.length < 2) return;
    if (newModalQuoteIds.length > 3) {
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Limit Exceeded",
        message: "You can only compare up to 3 quotations at a time on the Free plan.",
        limitType: "quotes_per_comparison",
      });
      return;
    }
    if (comparisons.length >= 3) {
      setShowCreateModal(false);
      setPlanLimitModal({
        isOpen: true,
        title: "Comparison Limit Reached",
        message: "You have reached the maximum limit of 3 comparisons on the Free plan. To create a new comparison, please delete an existing one or upgrade your account.",
        limitType: "comparisons",
      });
      return;
    }
    setIsCreatingComparison(true);
    const selectedQuotes = allQuotations.filter((q) => newModalQuoteIds.includes(q.id));
    const finalName = newModalName.trim() || generateDefaultComparisonName(selectedQuotes);

    try {
      let created: QuoteComparisonRecord;
      try {
        created = await createComparisonInApi({
          name: finalName,
          quoteIds: newModalQuoteIds,
        });
      } catch (err: any) {
        if (
          err.status === 403 ||
          err.message?.toLowerCase().includes("free plan") ||
          err.message?.toLowerCase().includes("limit")
        ) {
          throw err;
        }
        console.warn("API create comparison failed, falling back to local:", err);
        created = {
          id: `comp_${Date.now()}`,
          organizationId: "org-local",
          name: finalName,
          quoteIds: newModalQuoteIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const updated = [created, ...comparisons.filter((c) => c.id !== created.id)];
      setLocalComparisons(updated);
      saveLocalStoredComparisons(updated);
      onComparisonsChange?.(updated);
      setShowCreateModal(false);
      setSelectedComparisonId(created.id);
      onComparisonChange?.(created.id);

      // Trigger immediate AI audit
      const sortedQuoteIds = [...newModalQuoteIds].sort().join(",");
      lastAnalyzedKeyRef.current = `${created.id}:${sortedQuoteIds}`;
      prevComparisonIdRef.current = created.id;
      prevQuoteIdsRef.current = sortedQuoteIds;
      fetchAnalysisForScope(created.id, true);
    } catch (err: any) {
      if (
        err.status === 403 ||
        err.message?.toLowerCase().includes("free plan") ||
        err.message?.toLowerCase().includes("limit")
      ) {
        setShowCreateModal(false);
        setPlanLimitModal({
          isOpen: true,
          title: "Free Plan Limit",
          message: err.message || "You have reached the Free plan limits.",
          limitType: err.message?.toLowerCase().includes("3 quotation")
            ? "quotes_per_comparison"
            : "comparisons",
        });
        return;
      }
      alert(err.message || "Failed to create comparison.");
    } finally {
      setIsCreatingComparison(false);
    }
  };

  // Shared Render for Create Custom Comparison Modal
  const renderCreateModal = () => {
    if (!mounted || !showCreateModal) return null;
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto min-h-screen">
        <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col my-auto text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FolderIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Create Comparison Project
                </h3>
                <p className="text-xs text-slate-500">
                  Choose at least 2 quotations to compare
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="shrink-0 space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Comparison Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              value={newModalName}
              onChange={(e) => setNewModalName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newModalQuoteIds.length >= 2 && !isCreatingComparison && newModalName.trim()) {
                  e.preventDefault();
                  handleConfirmCreateCustom();
                }
              }}
              placeholder="e.g. Server Hardware Bid Q4"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium shadow-2xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px]">
            {allQuotations.map((q) => {
              const isChecked = newModalQuoteIds.includes(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all gap-3 ${
                    isChecked
                      ? "bg-blue-50/80 border-blue-300 shadow-2xs"
                      : "bg-white hover:bg-slate-50 border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setNewModalQuoteIds((prev) => {
                          if (prev.includes(q.id)) {
                            return prev.filter((id) => id !== q.id);
                          }
                          if (prev.length >= 3) {
                            setPlanLimitModal({
                              isOpen: true,
                              title: "Quotation Limit Exceeded",
                              message: "You can only compare up to 3 quotations at a time on the Free plan.",
                              limitType: "quotes_per_comparison",
                            });
                            return prev;
                          }
                          return [...prev, q.id];
                        });
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">
                          {q.supplierName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          #{q.quoteNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {q.items.length} items • Turnaround: {q.deliveryLeadTime}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900 block">
                      {formatCurrency(q.totalAmount)}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              Selected: <span className="font-bold text-slate-900">{newModalQuoteIds.length}</span> quotes (min 2)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateCustom}
                disabled={isCreatingComparison || newModalQuoteIds.length < 2 || !newModalName.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                {isCreatingComparison ? "Creating..." : "Create & Audit"}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Find quotation matching the recommended supplier
  const recommendedQuote = useMemo(() => {
    if (!analysis) return null;
    return (
      activeQuotes.find(
        (q) =>
          q.supplierName.toLowerCase() ===
          analysis.recommendedSupplierName?.toLowerCase()
      ) || activeQuotes[0]
    );
  }, [analysis, activeQuotes]);

  // Find scorecard for the winning recommended supplier
  const recommendedScorecard = useMemo(() => {
    if (!analysis?.supplierScores || !analysis.recommendedSupplierName) return null;
    return (
      analysis.supplierScores.find(
        (s) =>
          s.supplierName.toLowerCase() ===
          analysis.recommendedSupplierName.toLowerCase()
      ) || analysis.supplierScores[0] || null
    );
  }, [analysis]);

  // Cross-supplier item scope analysis: Identify unique line items across active quotes
  const crossQuoteItemScope = useMemo(() => {
    const masterMap = new Map<string, string>(); // normalizedKey -> item description

    activeQuotes.forEach((q) => {
      (q.items || []).forEach((item) => {
        const desc = item.description?.trim() || "";
        const sku = item.sku?.trim() || "";
        const key = (sku || desc).toLowerCase();
        if (key && !masterMap.has(key)) {
          masterMap.set(key, desc || sku || "Line Item");
        }
      });
    });

    const totalScopeItems = masterMap.size;
    const quoteMissingMap = new Map<string, string[]>(); // quoteId / quoteNumber / supplierName (lowercase) -> missing item descriptions

    if (activeQuotes.length > 1 && totalScopeItems > 0) {
      activeQuotes.forEach((q) => {
        const presentKeys = new Set(
          (q.items || []).map((i) =>
            (i.sku?.trim() || i.description?.trim() || "").toLowerCase()
          )
        );
        const missing: string[] = [];
        masterMap.forEach((title, key) => {
          if (!presentKeys.has(key)) {
            missing.push(title);
          }
        });
        quoteMissingMap.set(q.id.toLowerCase(), missing);
        if (q.quoteNumber) quoteMissingMap.set(q.quoteNumber.toLowerCase(), missing);
        if (q.supplierName) quoteMissingMap.set(q.supplierName.toLowerCase(), missing);
      });
    }

    return { masterMap, totalScopeItems, quoteMissingMap };
  }, [activeQuotes]);

  // Compute savings metrics vs benchmark
  const savingsMetrics = useMemo(() => {
    if (!activeQuotes.length || !recommendedQuote) {
      return { maxQuoteAmount: 0, percentSaved: 0, savings: 0 };
    }
    const amounts = activeQuotes.map((q) => q.totalAmount);
    const maxQuoteAmount = Math.max(...amounts);
    const baseline = maxQuoteAmount > 0 ? maxQuoteAmount : recommendedQuote.totalAmount;
    const savings =
      analysis?.projectedSavings !== undefined && analysis.projectedSavings > 0
        ? analysis.projectedSavings
        : Math.max(0, baseline - recommendedQuote.totalAmount);
    const percentSaved =
      baseline > 0 && savings > 0 ? Math.round((savings / baseline) * 100) : 0;
    return { maxQuoteAmount, percentSaved, savings };
  }, [activeQuotes, recommendedQuote, analysis]);

  // Reconciled scorecards guaranteeing that ALL active quotations in the comparison have a visible scorecard
  const effectiveScorecards = useMemo(() => {
    if (!analysis) return [];
    const baseScores = [...(analysis.supplierScores || [])];

    const scoredKeySet = new Set(
      baseScores.map((s) => (s.quoteNumber || s.supplierName || "").toLowerCase().trim())
    );

    activeQuotes.forEach((q) => {
      const qNum = (q.quoteNumber || "").toLowerCase().trim();
      const sName = (q.supplierName || "").toLowerCase().trim();

      if (!scoredKeySet.has(qNum) && !scoredKeySet.has(sName)) {
        const missing = crossQuoteItemScope.quoteMissingMap.get(q.id.toLowerCase()) || [];
        const totalScope = crossQuoteItemScope.totalScopeItems;
        const hasMissing = missing.length > 0 && totalScope > 1;
        const quotedCount = Math.max(0, totalScope - missing.length);
        const coverageRatio = totalScope > 0 ? (totalScope - missing.length) / totalScope : 1;
        const scopePenalty = hasMissing ? Math.round((1 - coverageRatio) * 35) : 0;
        const overallScore = Math.max(15, Math.min(100, 80 - scopePenalty));

        baseScores.push({
          supplierName: q.supplierName,
          quoteNumber: q.quoteNumber,
          overallScore,
          priceScore: 75,
          deliveryScore: 80,
          termsScore: 75,
          riskScore: hasMissing ? 50 : 80,
          strengths: hasMissing ? ["Competitive unit price on quoted items"] : ["Complete line-item scope quoted"],
          weaknesses: hasMissing ? [`Missing ${missing.length} scope item(s)`] : ["Standard supplier terms"],
          missingItems: missing,
          missingItemsCount: missing.length,
          totalScopeItemsCount: totalScope,
          itemCoveragePercent: totalScope > 0 ? Math.round(coverageRatio * 100) : 100,
          scopePenalized: hasMissing,
        });
        scoredKeySet.add(qNum);
        scoredKeySet.add(sName);
      }
    });

    return baseScores;
  }, [analysis, activeQuotes, crossQuoteItemScope]);

  // Copy Executive Summary helper
  const handleCopyExecutiveSummary = () => {
    if (!analysis) return;
    const text = `🏆 QuoteGenie Sourcing Recommendation:
Winner: ${analysis.recommendedSupplierName}
Projected Savings: ${formatCurrency(analysis.projectedSavings)}
Rationale: ${analysis.recommendationReason}
Executive Summary: ${analysis.summary}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Filtered risks
  const filteredRisks = useMemo(() => {
    if (!analysis?.riskAnalysis) return [];
    if (riskSeverityFilter === "all") return analysis.riskAnalysis;
    return analysis.riskAnalysis.filter((r) => r.level === riskSeverityFilter);
  }, [analysis?.riskAnalysis, riskSeverityFilter]);

  // Counts for tabs & filters
  const riskCounts = useMemo(() => {
    if (!analysis?.riskAnalysis) return { all: 0, high: 0, medium: 0, low: 0 };
    return {
      all: analysis.riskAnalysis.length,
      high: analysis.riskAnalysis.filter((r) => r.level === "high").length,
      medium: analysis.riskAnalysis.filter((r) => r.level === "medium").length,
      low: analysis.riskAnalysis.filter((r) => r.level === "low").length,
    };
  }, [analysis?.riskAnalysis]);

  // 1. Empty state: no quotations uploaded at all
  if (allQuotations.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-indigo-50/50">
          <SparklesIcon className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          No Quotations to Analyze
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 mb-6 leading-relaxed">
          Upload at least one supplier quotation PDF to run AI-powered strategic
          procurement audits, risk detection, and supplier scorecards.
        </p>
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UploadCloudIcon className="w-4 h-4" />
          <span>Upload Quotation PDF</span>
        </button>
      </div>
    );
  }

  // 2. Empty state: only 1 quotation uploaded, cannot compare (need at least 2)
  if (comparisons.length === 0 && (!scopedQuoteIds || scopedQuoteIds.length < 2) && allQuotations.length === 1) {
    return (
      <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 sm:p-14 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
          <ScaleIcon className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900">
          At Least 2 Quotations Required for Comparison
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-5 leading-relaxed">
          AI Quote Analysis evaluates supplier combinations side-by-side to benchmark scores, audit missing line items, and identify commercial risks.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-6 font-medium">
          <span className="text-slate-400">Current upload:</span>
          <span className="font-semibold text-slate-900">
            {allQuotations[0].supplierName} (#{allQuotations[0].quoteNumber})
          </span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <UploadCloudIcon className="w-4 h-4" />
            <span>Upload Second Quotation</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty state: quotations exist (>= 2), but no comparison projects have been created yet
  if (comparisons.length === 0 && (!scopedQuoteIds || scopedQuoteIds.length < 2)) {
    const uniqueSuppliers = Array.from(new Set(allQuotations.map((q) => q.supplierName)));

    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center ring-8 ring-indigo-50/50">
          <SparklesIcon className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            No Sourcing Scenarios Saved Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            You have <span className="font-semibold text-slate-800">{allQuotations.length} supplier quotations</span> ready for evaluation. Create your first sourcing comparison scenario to generate supplier scorecards, executive award decisions, and line-item gap audits.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
          <span className="text-slate-400 font-medium">Available suppliers:</span>
          {uniqueSuppliers.slice(0, 4).map((name, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 text-[11px] shadow-2xs"
            >
              {name}
            </span>
          ))}
          {uniqueSuppliers.length > 4 && (
            <span className="text-[11px] text-slate-400">
              +{uniqueSuppliers.length - 4} more
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleQuickCreateAllComparison}
            disabled={isCreatingComparison}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {isCreatingComparison ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating & Auditing...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>Compare All ({allQuotations.length}) Quotations</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenCreateCustomModal}
            disabled={isCreatingComparison}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <PlusIcon className="w-4 h-4 text-slate-500" />
            <span>Select Specific Quotations</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={onOpenUpload}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline cursor-pointer"
          >
            Or upload additional quotation PDFs
          </button>
        </div>

        {/* Create Custom Comparison Modal */}
        {renderCreateModal()}
      </div>
    );
  }

  // 4. If comparisons exist but active one is still resolving into selectedComparison
  if (comparisons.length > 0 && !selectedComparison && selectedComparisonId !== "all") {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 max-w-md mx-auto my-8 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center animate-pulse">
          <SparklesIcon className="w-6 h-6" />
        </div>
        <p className="text-xs text-slate-500 font-medium">Loading comparison intelligence...</p>
      </div>
    );
  }


  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* ======================================================== */}
      {/* 1. PROFESSIONAL HEADER: TITLE, SCOPE & ACTIONS           */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
            <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-wider uppercase">
                Strategic Sourcing Audit
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-tight truncate sm:whitespace-normal">
              {selectedComparison ? selectedComparison.name : "Global Sourcing Baseline"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1 sm:line-clamp-none">
              {activeQuotes.length} supplier quotation{activeQuotes.length !== 1 ? "s" : ""} benchmarked
              {activeQuotes.length > 0 && (
                <span className="text-slate-600"> · {activeSupplierNames}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-stretch sm:items-center gap-2.5 shrink-0 flex-col sm:flex-row w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenCreateCustomModal}
            className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
            title="Create a new comparison scenario"
          >
            <FolderIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>New Comparison</span>
          </button>

          {selectedComparison && (
            <button
              onClick={handleOpenAddQuotesModal}
              className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
              title={`Manage quotations in "${selectedComparison.name}"`}
            >
              <PlusIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Scope</span>
            </button>
          )}

          <button
            onClick={() => fetchAnalysisForScope(selectedComparisonId, true)}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-600 active:scale-[0.98]"
            title="Re-run AI quote audit for current scope"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Re-Run Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Analysis Notice:</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAnalysisForScope(selectedComparisonId, false)}
            className="font-bold underline hover:text-rose-900 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-1 w-full">
            <div className="h-full bg-white/30 animate-pulse rounded-full" style={{ width: "60%" }} />
          </div>
          <div className="p-10 text-center space-y-5">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
              <div className="relative w-14 h-14 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div className="max-w-sm mx-auto space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Running Procurement Intelligence...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {selectedComparison
                  ? `Scoring ${activeQuotes.length} suppliers in "${selectedComparison.name}" — evaluating pricing, delivery SLAs, contract risks, and scope coverage.`
                  : "Evaluating vendor quotations — scoring competitiveness, detecting hidden risks, and generating award recommendations."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {["Pricing Model", "Risk Analysis", "Scoring"].map((step, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Analysis Content */}
      {!isLoading && analysis && (
        <>
          {/* ======================================================== */}
          {/* 2. EXECUTIVE AWARD DECISION (HERO - LIGHT & REFINED)     */}
          {/* ======================================================== */}
          <div className="relative rounded-3xl bg-white text-slate-900 border border-slate-200/90 shadow-sm p-4 sm:p-7 space-y-5 sm:space-y-6 overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

            {/* Top Bar: Award Badge & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs">
                  <TrophyIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>RECOMMENDED VENDOR ALLOCATION</span>
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  Ranked #1 of {activeQuotes.length} benchmarked quotations
                </span>
              </div>

              <button
                onClick={handleCopyExecutiveSummary}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Copy decision summary to clipboard"
              >
                {copiedSummary ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-blue-700 font-semibold">Summary Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Decision Summary</span>
                  </>
                )}
              </button>
            </div>

            {/* Winner Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm ring-4 ring-blue-50 shrink-0">
                  {(analysis.recommendedSupplierName || "S").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 break-words"
                      title={analysis.recommendedSupplierName}
                    >
                      {analysis.recommendedSupplierName}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                      Rank #1 Preferred
                    </span>
                    {crossQuoteItemScope.totalScopeItems > 1 && (
                      recommendedScorecard?.missingItems && recommendedScorecard.missingItems.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                          <AlertTriangleIcon className="w-3 h-3 text-blue-600" />
                          <span>Partial Scope ({recommendedScorecard.missingItems.length} missing)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <ShieldCheckIcon className="w-3 h-3 text-blue-600" />
                          <span>100% Scope Coverage</span>
                        </span>
                      )
                    )}
                    {recommendedQuote && (
                      <button
                        type="button"
                        onClick={() => setActivePreviewQuote(recommendedQuote)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100/80 text-blue-800 border border-blue-200/80 cursor-pointer transition-colors shadow-2xs"
                      >
                        <EyeIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Quotation Breakdown</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                    {recommendedQuote && (
                      <span className="font-mono text-slate-700 font-semibold">
                        Quote #{recommendedQuote.quoteNumber}
                      </span>
                    )}
                    <span>•</span>
                    <span>Lead Time: {recommendedQuote?.deliveryDays || 7} Days</span>
                    <span>•</span>
                    <span>Settlement Terms: {recommendedQuote?.paymentTerms || "Net 30"}</span>
                  </div>
                </div>
              </div>

              {/* Overall Score Pill */}
              <div className="flex items-center justify-between sm:block sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-slate-100 sm:border-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Overall Fit Score
                </span>
                <div className="flex items-baseline gap-1 mt-0.5 sm:justify-end">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-blue-600">
                    {recommendedScorecard?.overallScore || 90}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* AI Award Rationale Box */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-50/60 to-slate-50/70 border border-blue-200/80 p-4 sm:p-5 border-l-4 border-l-blue-600 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                <SparklesIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Strategic Allocation Rationale</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {analysis.recommendationReason}
              </p>
            </div>

            {/* 4 Key Decision Metric Cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Total Spend */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/50 transition-colors shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Total Award Value
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1 truncate">
                  {recommendedQuote
                    ? formatCurrency(recommendedQuote.totalAmount, 2)
                    : "Optimal"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Total committed spend
                </div>
              </div>

              {/* Metric 2: Net Savings */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 hover:bg-blue-100/40 transition-colors shadow-2xs">
                <span className="text-[10px] text-blue-800 uppercase tracking-wider font-bold block">
                  Projected Cost Savings
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-blue-700 mt-1 truncate">
                  {analysis.projectedSavings > 0
                    ? `+${formatCurrency(analysis.projectedSavings)}`
                    : "Best Quoted Rate"}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5 truncate font-medium">
                  {savingsMetrics.percentSaved > 0
                    ? `${savingsMetrics.percentSaved}% below benchmark high`
                    : "Lowest cost allocation"}
                </div>
              </div>

              {/* Metric 3: Fulfillment SLA */}
              <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/70 hover:bg-sky-100/40 transition-colors shadow-2xs">
                <span className="text-[10px] text-sky-800 uppercase tracking-wider font-bold block">
                  Fulfillment SLA
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-sky-900 mt-1 truncate">
                  {recommendedQuote
                    ? `${recommendedQuote.deliveryDays} Days`
                    : "Standard"}
                </div>
                <div className="text-[11px] text-sky-700 mt-0.5 truncate font-medium">
                  {recommendedQuote?.deliveryLeadTime || "Standard turnaround"}
                </div>
              </div>

              {/* Metric 4: Commercial Terms */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 hover:bg-indigo-100/40 transition-colors shadow-2xs">
                <span className="text-[10px] text-indigo-800 uppercase tracking-wider font-bold block">
                  Commercial Terms
                </span>
                <div className="text-lg sm:text-xl font-bold text-indigo-950 mt-1 truncate">
                  {recommendedQuote?.paymentTerms || "Net 30 Days"}
                </div>
                <div className="text-[11px] text-indigo-700 mt-0.5 truncate font-medium">
                  Verified settlement schedule
                </div>
              </div>
            </div>

            {/* Verified Strengths Tags */}
            {recommendedScorecard?.strengths && recommendedScorecard.strengths.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Key Differentiators:
                </span>
                {recommendedScorecard.strengths.map((str, sIdx) => (
                  <span
                    key={sIdx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{str}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Executive Briefing Takeaway */}
            {analysis.summary && (
              <div className="pt-4 border-t border-slate-100 flex items-start gap-3 text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                <DocumentTextIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-800 font-semibold">Executive Sourcing Brief: </strong>
                  {analysis.summary}
                </p>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 3. INTERACTIVE SECTION TABS                              */}
          {/* ======================================================== */}
          <div className="w-full overflow-x-auto no-scrollbar pb-1">
            <div className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 inline-flex items-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("scorecards")}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "scorecards"
                    ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <ChartBarIcon className={`w-3.5 h-3.5 ${activeTab === "scorecards" ? "text-indigo-600" : "text-slate-400"}`} />
                <span>Vendor Scorecards ({effectiveScorecards.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("risks")}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "risks"
                    ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <ShieldCheckIcon className={`w-3.5 h-3.5 ${activeTab === "risks" ? "text-rose-600" : "text-slate-400"}`} />
                <span>Contract & Fulfillment Risks ({riskCounts.all})</span>
                {riskCounts.high > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. TAB CONTENT: SCORECARDS                               */}
          {/* ======================================================== */}
          {activeTab === "scorecards" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Comparative Vendor Scorecards
                  </h3>
                  <p className="text-xs text-slate-500">
                    Multidimensional supplier benchmark evaluating pricing competitiveness, delivery turnaround, payment terms, and scope fulfillment
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400 self-start sm:self-auto">
                  {effectiveScorecards.length} vendor{effectiveScorecards.length !== 1 ? "s" : ""} evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
                {effectiveScorecards.map((scorecard, idx) => {
                  const isWinner =
                    scorecard.supplierName.toLowerCase() ===
                    analysis.recommendedSupplierName?.toLowerCase();

                  const matchingQuote = allQuotations.find(
                    (q) =>
                      (scorecard.quoteNumber &&
                        q.quoteNumber.trim().toLowerCase() === scorecard.quoteNumber.trim().toLowerCase()) ||
                      q.supplierName.trim().toLowerCase() === scorecard.supplierName.trim().toLowerCase()
                  );

                  // Extract missing items: from backend scorecard or computed scope map
                  const missingItems: string[] =
                    (scorecard.missingItems && scorecard.missingItems.length > 0)
                      ? scorecard.missingItems
                      : (matchingQuote
                          ? (crossQuoteItemScope.quoteMissingMap.get(matchingQuote.id.toLowerCase()) ||
                             crossQuoteItemScope.quoteMissingMap.get(matchingQuote.quoteNumber.toLowerCase()) ||
                             crossQuoteItemScope.quoteMissingMap.get(matchingQuote.supplierName.toLowerCase()) || [])
                          : (crossQuoteItemScope.quoteMissingMap.get(scorecard.quoteNumber.toLowerCase()) ||
                             crossQuoteItemScope.quoteMissingMap.get(scorecard.supplierName.toLowerCase()) || []));

                  const totalScope = scorecard.totalScopeItemsCount || crossQuoteItemScope.totalScopeItems;
                  const hasMissingItems = missingItems.length > 0 && totalScope > 1;
                  const quotedCount = Math.max(0, totalScope - missingItems.length);
                  const coveragePercent = totalScope > 0 ? Math.round((quotedCount / totalScope) * 100) : 100;

                  // Apply scope completeness penalty if not already enforced
                  const scopePenalty = hasMissingItems ? Math.round((1 - (quotedCount / totalScope)) * 35) : 0;
                  const effectiveScore = scorecard.scopePenalized
                    ? scorecard.overallScore
                    : Math.max(15, Math.min(scorecard.overallScore, 100 - scopePenalty));

                  return (
                    <div
                      key={idx}
                      onClick={() => matchingQuote && setActivePreviewQuote(matchingQuote)}
                      className={`rounded-3xl p-4 sm:p-6 border transition-all flex flex-col justify-between ${
                        matchingQuote ? "cursor-pointer group hover:shadow-md" : ""
                      } ${
                        isWinner
                          ? "bg-white border-2 border-blue-500 shadow-sm ring-4 ring-blue-500/10"
                          : hasMissingItems
                          ? "bg-white border-2 border-blue-400 shadow-2xs ring-4 ring-blue-400/10 hover:border-blue-500"
                          : "bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300/80 hover:shadow-xs"
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 border shadow-2xs ${
                                isWinner
                                  ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500"
                                  : hasMissingItems
                                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400"
                                  : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-slate-200"
                              }`}
                            >
                              {scorecard.supplierName.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <span
                                className="font-bold text-sm text-slate-900 block truncate group-hover:text-indigo-600 transition-colors"
                                title={scorecard.supplierName}
                              >
                                {scorecard.supplierName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                                Quote #{scorecard.quoteNumber}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-xl sm:text-2xl font-black font-mono block ${
                                effectiveScore >= 80
                                  ? "text-blue-600"
                                  : effectiveScore >= 65
                                  ? "text-indigo-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {effectiveScore}/100
                            </span>
                            <div className="flex flex-col items-end gap-0.5 mt-0.5">
                              {isWinner && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                                  Award Preferred
                                </span>
                              )}
                              {hasMissingItems && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                  ℹ️ Incomplete
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Missing Items Informational Alert Box */}
                        {hasMissingItems ? (
                          <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 text-xs shadow-2xs">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 min-w-0">
                                <AlertTriangleIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="truncate">
                                  Scope Gap: {missingItems.length} Missing Item{missingItems.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-950 border border-blue-200 shrink-0">
                                {quotedCount}/{totalScope} Quoted ({coveragePercent}%)
                              </span>
                            </div>

                            <p className="text-[11px] text-blue-800 leading-tight">
                              Score adjusted (-{scopePenalty || 15} pts). Omitted line items required in benchmark:
                            </p>

                            <div className="space-y-1 pt-0.5 max-h-28 overflow-y-auto pr-0.5">
                              {missingItems.map((item, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 bg-white/95 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                                >
                                  <span className="text-blue-600 font-bold shrink-0">✕</span>
                                  <span className="truncate">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : totalScope > 1 ? (
                          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-[11px] font-semibold text-blue-800 shadow-2xs">
                            <div className="flex items-center gap-1.5">
                              <CheckIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>100% Scope Coverage</span>
                            </div>
                            <span className="text-[10px] font-mono text-blue-700 font-bold">
                              All {totalScope} items quoted
                            </span>
                          </div>
                        ) : null}

                        {/* Breakdown Bars */}
                        <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                          {totalScope > 1 && (
                            <div>
                              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                                <span className="flex items-center gap-1">
                                  <span>Scope Coverage</span>
                                  {hasMissingItems && (
                                    <span className="text-[10px] text-blue-600 font-bold">
                                      ({missingItems.length} missing)
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono font-bold text-blue-700">
                                  {coveragePercent}%
                                </span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all bg-gradient-to-r from-blue-500 to-indigo-600"
                                  style={{ width: `${coveragePercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Price Competitiveness (40%)</span>
                              <span className="font-mono font-bold text-blue-700">
                                {scorecard.priceScore}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                                style={{ width: `${scorecard.priceScore}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Delivery Turnaround (25%)</span>
                              <span className="font-mono font-bold text-sky-700">
                                {scorecard.deliveryScore}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all"
                                style={{ width: `${scorecard.deliveryScore}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Payment Terms (20%)</span>
                              <span className="font-mono font-bold text-indigo-700">
                                {scorecard.termsScore}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                                style={{ width: `${scorecard.termsScore}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Risk Resilience (15%)</span>
                              <span className="font-mono font-bold text-sky-700">
                                {100 - scorecard.riskScore}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all"
                                style={{ width: `${100 - scorecard.riskScore}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                          {scorecard.strengths && scorecard.strengths.length > 0 && (
                            <div>
                              <span className="font-semibold text-blue-700 block mb-1">
                                Verified Strengths:
                              </span>
                              <ul className="space-y-1 text-slate-600">
                                {scorecard.strengths.slice(0, 2).map((s, sIdx) => (
                                  <li key={sIdx} className="flex items-start gap-1.5">
                                    <CheckIcon className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {scorecard.weaknesses && scorecard.weaknesses.length > 0 && (
                            <div>
                              <span className="font-semibold text-slate-600 block mb-1">
                                Areas of Concern:
                              </span>
                              <ul className="space-y-1 text-slate-500">
                                {scorecard.weaknesses.slice(0, 2).map((w, wIdx) => (
                                  <li key={wIdx} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                    <span>{w}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action footer: view full quotation */}
                      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs mt-3.5 gap-2">
                        {matchingQuote ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePreviewQuote(matchingQuote);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer group-hover:underline"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>View Quotation Breakdown</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Quotation record unavailable</span>
                        )}
                        {matchingQuote && (
                          <span className="text-xs sm:text-sm font-mono font-black text-slate-900 shrink-0">
                            {formatCurrency(matchingQuote.totalAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. TAB CONTENT: CONTRACT RISKS                           */}
          {/* ======================================================== */}
          {activeTab === "risks" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Commercial & Fulfillment Risk Register
                  </h3>
                  <p className="text-xs text-slate-500">
                    Identified liabilities, turnaround exposures, price volatility clauses, and single-source dependencies
                  </p>
                </div>

                <div className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 inline-flex flex-wrap gap-1 text-xs font-semibold self-stretch sm:self-auto">
                  <button
                    onClick={() => setRiskSeverityFilter("all")}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      riskSeverityFilter === "all"
                        ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    All ({riskCounts.all})
                  </button>
                  <button
                    onClick={() => setRiskSeverityFilter("high")}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      riskSeverityFilter === "high"
                        ? "bg-white text-rose-700 shadow-xs font-bold border border-slate-200/80"
                        : "text-slate-600 hover:text-rose-700 hover:bg-white/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>High ({riskCounts.high})</span>
                  </button>
                  <button
                    onClick={() => setRiskSeverityFilter("medium")}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      riskSeverityFilter === "medium"
                        ? "bg-white text-blue-700 shadow-xs font-bold border border-slate-200/80"
                        : "text-slate-600 hover:text-blue-700 hover:bg-white/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Medium ({riskCounts.medium})</span>
                  </button>
                  <button
                    onClick={() => setRiskSeverityFilter("low")}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      riskSeverityFilter === "low"
                        ? "bg-white text-slate-800 shadow-xs font-bold border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Low ({riskCounts.low})</span>
                  </button>
                </div>
              </div>

              {filteredRisks.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 shadow-2xs">
                  No risk items found matching this filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
                  {filteredRisks.map((risk, rIdx) => {
                    const isHigh = risk.level === "high";
                    const isMed = risk.level === "medium";

                    return (
                      <div
                        key={rIdx}
                        className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2.5 transition-all hover:shadow-xs ${
                          isHigh
                            ? "border-l-4 border-l-rose-500"
                            : isMed
                            ? "border-l-4 border-l-blue-500"
                            : "border-l-4 border-l-slate-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                                isHigh
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : isMed
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {risk.level} Priority
                            </span>
                            <span
                              className="text-xs font-bold text-slate-900 truncate bg-slate-100/80 px-2 py-0.5 rounded-md"
                              title={risk.affectedSupplier}
                            >
                              {risk.affectedSupplier}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 break-words leading-snug">
                          {risk.title}
                        </h4>

                        <p className="text-xs text-slate-600 leading-relaxed font-normal">
                          {risk.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* 9. SUPPLIER QUOTATION DETAILS MODAL                      */}
      {/* ======================================================== */}
      {mounted && activePreviewQuote && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center min-h-screen animate-in fade-in duration-100"
          onClick={() => setActivePreviewQuote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[88vh] flex flex-col my-auto text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {activePreviewQuote.quoteNumber}
                  </span>
                  {activePreviewQuote.createdAt && (
                    <span className="text-[11px] text-slate-400">
                      Date: {formatDate(activePreviewQuote.createdAt)}
                    </span>
                  )}
                </div>
                <h3
                  className="text-base sm:text-lg font-bold text-slate-900 mt-1 break-words"
                  title={activePreviewQuote.supplierName}
                >
                  {activePreviewQuote.supplierName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewQuote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl shrink-0 cursor-pointer transition-colors"
                title="Close modal"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-1 py-1">
              {/* Commercial Terms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Turnaround SLA
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                    {activePreviewQuote.deliveryLeadTime || `${activePreviewQuote.deliveryDays} Days`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Valid Until
                  </span>
                  <span className="font-mono font-medium text-slate-800 mt-0.5 block truncate">
                    {activePreviewQuote.validUntil || "30 Days"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Payment Terms
                  </span>
                  <span className="font-medium text-slate-800 mt-0.5 block truncate">
                    {activePreviewQuote.paymentTerms || "Net 30 Days"}
                  </span>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Line Items Breakdown</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {activePreviewQuote.items.length} item{activePreviewQuote.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-slate-500 text-[10px] uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3.5">Item Description</th>
                        <th className="py-2 px-2 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePreviewQuote.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3.5 font-medium text-slate-900">
                            <div>{item.description}</div>
                            {item.sku && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                SKU: {item.sku}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {formatCurrency(item.unitPrice, 2)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer (Pinned at bottom) */}
            <div className="shrink-0 space-y-3 pt-3 border-t border-slate-100">
              {/* Total Quotation Summary */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 p-3.5 sm:p-4 rounded-2xl border border-indigo-100/70 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Quoted Value
                  </span>
                  <span className="text-xs text-slate-500">All included items & taxes</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-xl text-slate-900">
                    {formatCurrency(activePreviewQuote.totalAmount, 2)}
                  </span>
                </div>
              </div>

              {/* Close button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePreviewQuote(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 10. ADD / MANAGE QUOTES IN COMPARISON MODAL              */}
      {/* ======================================================== */}
      {mounted && showAddQuotesModal && selectedComparison && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto min-h-screen">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col my-auto text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Quotations to Comparison
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-xs" title={selectedComparison.name}>
                    Project: <span className="text-indigo-600 font-semibold">{selectedComparison.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddQuotesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 shrink-0">
              Select which supplier quotations should be included in this comparison scenario. Updating will recalculate the AI quote analysis:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {allQuotations.map((q) => {
                const isChecked = modalAddQuoteIds.includes(q.id);
                const wasOriginallyIncluded = (selectedComparison.quoteIds || []).includes(q.id);

                return (
                  <label
                    key={q.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all gap-3 ${
                      isChecked
                        ? "bg-indigo-50/80 border-indigo-300 shadow-2xs"
                        : "bg-white hover:bg-slate-50 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setModalAddQuoteIds((prev) => {
                            if (prev.includes(q.id)) {
                              return prev.filter((id) => id !== q.id);
                            }
                            if (prev.length >= 3) {
                              setPlanLimitModal({
                                isOpen: true,
                                title: "Quotation Limit Exceeded",
                                message: "You can only compare up to 3 quotations at a time on the Free plan.",
                                limitType: "quotes_per_comparison",
                              });
                              return prev;
                            }
                            return [...prev, q.id];
                          });
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">
                            {q.supplierName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            #{q.quoteNumber}
                          </span>
                          {wasOriginallyIncluded ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                              Current
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              + New
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {q.items.length} items • Turnaround: {q.deliveryLeadTime}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 block">
                        {formatCurrency(q.totalAmount)}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Selected: <span className="font-bold text-slate-900">{modalAddQuoteIds.length}</span> quotes (min 2)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuotesModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddQuotes}
                  disabled={isUpdatingComparison || modalAddQuoteIds.length < 2}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  {isUpdatingComparison ? "Updating & Auditing..." : "Update & Audit"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Custom Comparison Modal */}
      {renderCreateModal()}

      {/* Plan Limit Modal */}
      <PlanLimitModal
        isOpen={planLimitModal.isOpen}
        onClose={() => setPlanLimitModal((prev) => ({ ...prev, isOpen: false }))}
        title={planLimitModal.title}
        message={planLimitModal.message}
        limitType={planLimitModal.limitType}
      />
    </div>
  );
}
