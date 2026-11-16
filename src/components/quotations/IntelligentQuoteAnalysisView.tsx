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
} from "@/components/Icons";
import {
  analyzeQuotesWithAi,
  analyzeComparisonWithAi,
  getComparisonsFromApi,
  updateComparisonInApi,
  IntelligentAnalysisResult,
  RiskItem,
} from "@/services/api";
import { Quotation, QuoteComparisonRecord } from "@/types/quotation";
import {
  getLocalStoredComparisons,
  saveLocalStoredComparisons,
} from "@/services/comparisonStorage";
import { formatCurrency } from "@/utils/format";

interface IntelligentQuoteAnalysisViewProps {
  allQuotations: Quotation[];
  comparisons?: QuoteComparisonRecord[];
  onComparisonsChange?: (comparisons: QuoteComparisonRecord[]) => void;
  scopedQuoteIds?: string[];
  initialComparisonId?: string | null;
  onOpenUpload: () => void;
  onComparisonChange?: (comparisonId: string | null) => void;
}

type TabKey = "scorecards" | "risks" | "negotiation" | "split" | "roadmap";

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

  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(
    initialComparisonId
  );

  // Sync with initialComparisonId prop when changed externally
  useEffect(() => {
    setSelectedComparisonId(initialComparisonId);
  }, [initialComparisonId]);

  // Active view tab & filters
  const [activeTab, setActiveTab] = useState<TabKey>("scorecards");
  const [riskSeverityFilter, setRiskSeverityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<number | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activePreviewQuote, setActivePreviewQuote] = useState<Quotation | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAddQuotesModal, setShowAddQuotesModal] = useState(false);
  const [modalAddQuoteIds, setModalAddQuoteIds] = useState<string[]>([]);
  const [isUpdatingComparison, setIsUpdatingComparison] = useState(false);

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

  // Match scopedQuoteIds with existing comparison if needed
  useEffect(() => {
    if (!selectedComparisonId && scopedQuoteIds && scopedQuoteIds.length >= 2) {
      const sortedScope = [...scopedQuoteIds].sort().join(",");
      const match = comparisons.find(
        (r) => [...(r.quoteIds || [])].sort().join(",") === sortedScope
      );
      if (match) {
        setSelectedComparisonId(match.id);
      }
    }
  }, [scopedQuoteIds, selectedComparisonId, comparisons]);

  // Synchronize when initialComparisonId prop changes
  useEffect(() => {
    if (initialComparisonId !== undefined) {
      setSelectedComparisonId(initialComparisonId);
    }
  }, [initialComparisonId]);

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
    if (scopedQuoteIds && scopedQuoteIds.length > 0) {
      return `scoped:${[...scopedQuoteIds].sort().join(",")}`;
    }
    return null;
  }, [selectedComparison, scopedQuoteIds]);

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

      setAnalysis(result);
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

  // Copy email snippet helper
  const handleCopySnippet = (snippet: string, idx: number) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetIdx(idx);
    setTimeout(() => setCopiedSnippetIdx(null), 2500);
  };

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

  // Empty state: no quotations uploaded
  if (allQuotations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
          <SparklesIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          No Quotations to Analyze
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
          Upload at least one supplier quotation PDF to run AI-powered strategic
          procurement audits, risk detection, and negotiation battlecards.
        </p>
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UploadCloudIcon className="w-4 h-4" />
          <span>Upload Quotation PDF</span>
        </button>
      </div>
    );
  }


  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ======================================================== */}
      {/* 1. CLEAN HEADER: TITLE, SCOPE & ACTIONS                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Sourcing Intelligence</span>
            </span>
            {analysis?.isCached && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ⚡ Instant Insight
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {selectedComparison ? selectedComparison.name : "All Quotations Benchmark"}
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Evaluating {activeQuotes.length} supplier quotations • <span className="font-semibold text-slate-700">{activeSupplierNames}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {selectedComparison && (
            <button
              onClick={handleOpenAddQuotesModal}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1.5"
              title={`Add or manage quotations in "${selectedComparison.name}"`}
            >
              <PlusIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Quotation</span>
            </button>
          )}

          <button
            onClick={() => fetchAnalysisForScope(selectedComparisonId, true)}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Re-run live analysis for current scope"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Auditing Scope...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Re-Run AI Audit</span>
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
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center animate-pulse">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              Generating Procurement Intelligence...
            </h3>
            <p className="text-xs text-slate-500 break-words">
              {selectedComparison
                ? `Auditing ${selectedComparison.name} across suppliers ${activeSupplierNames}...`
                : "Auditing quotation pricing models, uncovering hidden risks, and synthesizing tactical counter-offers."}
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Content */}
      {!isLoading && analysis && (
        <>
          {/* ======================================================== */}
          {/* 2. EXECUTIVE AWARD DECISION (HERO - LIGHT & REFINED)     */}
          {/* ======================================================== */}
          <div className="rounded-3xl bg-white text-slate-900 border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-6">
            {/* Top Bar: Award Badge & Quick Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <TrophyIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>RECOMMENDED AWARD DECISION</span>
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  Ranked #1 among {activeQuotes.length} quotations
                </span>
              </div>

              <button
                onClick={handleCopyExecutiveSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                title="Copy decision summary to clipboard"
              >
                {copiedSummary ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Summary Copied!</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-2xl shadow-2xs shrink-0">
                  {(analysis.recommendedSupplierName || "S").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="text-2xl font-extrabold tracking-tight text-slate-900 break-words"
                      title={analysis.recommendedSupplierName}
                    >
                      {analysis.recommendedSupplierName}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Rank #1 Preferred
                    </span>
                    {crossQuoteItemScope.totalScopeItems > 1 && (
                      recommendedScorecard?.missingItems && recommendedScorecard.missingItems.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <AlertTriangleIcon className="w-3 h-3 text-amber-600" />
                          <span>Partial Scope ({recommendedScorecard.missingItems.length} missing)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <ShieldCheckIcon className="w-3 h-3 text-teal-600" />
                          <span>100% Complete Scope</span>
                        </span>
                      )
                    )}
                    {recommendedQuote && (
                      <button
                        type="button"
                        onClick={() => setActivePreviewQuote(recommendedQuote)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-100/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/60 cursor-pointer transition-colors shadow-2xs"
                      >
                        <EyeIcon className="w-3.5 h-3.5 text-emerald-700" />
                        <span>View Quotation Details</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    {recommendedQuote && (
                      <span className="font-mono text-slate-700 font-medium">
                        Quote #{recommendedQuote.quoteNumber}
                      </span>
                    )}
                    <span>•</span>
                    <span>Lead Time: {recommendedQuote?.deliveryDays || 7} Days</span>
                    <span>•</span>
                    <span>Terms: {recommendedQuote?.paymentTerms || "Net 30"}</span>
                  </div>
                </div>
              </div>

              {/* Overall Score Pill */}
              <div className="sm:text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Overall Fit Score
                </span>
                <div className="flex items-baseline gap-1 mt-0.5 sm:justify-end">
                  <span className="text-3xl font-black font-mono text-slate-900">
                    {recommendedScorecard?.overallScore || 90}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* AI Award Rationale Box */}
            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-200/70 p-4 border-l-4 border-l-emerald-600 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Strategic Award Rationale</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {analysis.recommendationReason}
              </p>
            </div>

            {/* 4 Key Decision Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Total Award Amount
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1">
                  {recommendedQuote
                    ? formatCurrency(recommendedQuote.totalAmount, 2)
                    : "Optimal"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Total quoted value
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold block">
                  Projected Net Savings
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
                  {analysis.projectedSavings > 0
                    ? `+${formatCurrency(analysis.projectedSavings)}`
                    : "Best Quoted Rate"}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5 truncate font-medium">
                  {savingsMetrics.percentSaved > 0
                    ? `${savingsMetrics.percentSaved}% below benchmark high`
                    : "Lowest cost allocation"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Delivery SLA
                </span>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1">
                  {recommendedQuote
                    ? `${recommendedQuote.deliveryDays} Days`
                    : "Standard"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {recommendedQuote?.deliveryLeadTime || "Standard turnaround"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Commercial Terms
                </span>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
                  {recommendedQuote?.paymentTerms || "Net 30 Days"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Verified payment schedule
                </div>
              </div>
            </div>

            {/* Verified Strengths Tags */}
            {recommendedScorecard?.strengths && recommendedScorecard.strengths.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Key Advantages:
                </span>
                {recommendedScorecard.strengths.map((str, sIdx) => (
                  <span
                    key={sIdx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                  >
                    <CheckIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{str}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Executive Briefing Takeaway */}
            {analysis.summary && (
              <div className="pt-4 border-t border-slate-100 flex items-start gap-3 text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/60">
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
          <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("scorecards")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "scorecards"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ChartBarIcon className="w-3.5 h-3.5" />
              <span>Supplier Scorecards ({effectiveScorecards.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("risks")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "risks"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              <span>Contract Risks ({riskCounts.all})</span>
              {riskCounts.high > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("negotiation")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "negotiation"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Negotiation Battlecards ({analysis.negotiationPoints?.length || 0})</span>
            </button>

            {analysis.splitSourcing && (
              <button
                onClick={() => setActiveTab("split")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === "split"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <TrendingDownIcon className="w-3.5 h-3.5" />
                <span>Split-Sourcing Strategy</span>
                {analysis.splitSourcing.potentialSavings > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                    +{formatCurrency(analysis.splitSourcing.potentialSavings)}
                  </span>
                )}
              </button>
            )}

            {analysis.strategicActionPlan && analysis.strategicActionPlan.length > 0 && (
              <button
                onClick={() => setActiveTab("roadmap")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === "roadmap"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ClockIcon className="w-3.5 h-3.5" />
                <span>Action Roadmap</span>
              </button>
            )}
          </div>

          {/* ======================================================== */}
          {/* 4. TAB CONTENT: SCORECARDS                               */}
          {/* ======================================================== */}
          {activeTab === "scorecards" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comparative Supplier Scorecards
                </h3>
                <p className="text-xs text-slate-500">
                  Weighted evaluation across price competitiveness, delivery turnaround, payment terms, and vendor risk
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                        matchingQuote ? "cursor-pointer group hover:shadow-md" : ""
                      } ${
                        isWinner
                          ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30 hover:border-emerald-500"
                          : hasMissingItems
                          ? "bg-white border-amber-200/90 shadow-2xs hover:border-amber-300"
                          : "bg-white border-slate-200/80 shadow-2xs hover:border-indigo-300"
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-bold text-sm text-slate-900 block truncate"
                              title={scorecard.supplierName}
                            >
                              {scorecard.supplierName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                              {scorecard.quoteNumber}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-lg font-black font-mono block ${
                                effectiveScore >= 80
                                  ? "text-emerald-600"
                                  : effectiveScore >= 65
                                  ? "text-amber-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {effectiveScore}/100
                            </span>
                            <div className="flex flex-col items-end gap-0.5 mt-0.5">
                              {isWinner && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  Preferred
                                </span>
                              )}
                              {hasMissingItems && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  ⚠️ Incomplete
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Missing Items Informational Alert Box */}
                        {hasMissingItems ? (
                          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 min-w-0">
                                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  Scope Gap: {missingItems.length} Missing Item{missingItems.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 shrink-0">
                                {quotedCount}/{totalScope} Quoted ({coveragePercent}%)
                              </span>
                            </div>

                            <p className="text-[11px] text-amber-800 leading-tight">
                              Score penalized (-{scopePenalty || 15} pts). Omitted line items required in benchmark:
                            </p>

                            <div className="space-y-1 pt-0.5 max-h-32 overflow-y-auto">
                              {missingItems.map((item, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-white/95 px-2 py-0.8 rounded-lg border border-rose-200 shadow-2xs"
                                >
                                  <span className="text-rose-600 font-bold shrink-0">✕</span>
                                  <span className="truncate">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : totalScope > 1 ? (
                          <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-[11px] font-semibold text-emerald-800">
                            <div className="flex items-center gap-1.5">
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>100% Item Coverage</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-700 font-bold">
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
                                  <span>Item Scope Coverage</span>
                                  {hasMissingItems && (
                                    <span className="text-[10px] text-rose-600 font-bold">
                                      ({missingItems.length} missing)
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`font-mono font-bold ${
                                    hasMissingItems ? "text-amber-700" : "text-emerald-700"
                                  }`}
                                >
                                  {coveragePercent}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    hasMissingItems ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${coveragePercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Price Competitiveness</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {scorecard.priceScore}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${scorecard.priceScore}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Delivery Turnaround</span>
                              <span className="font-mono font-bold text-sky-700">
                                {scorecard.deliveryScore}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-sky-500 rounded-full"
                                style={{ width: `${scorecard.deliveryScore}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Payment Terms</span>
                              <span className="font-mono font-bold text-indigo-700">
                                {scorecard.termsScore}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${scorecard.termsScore}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                              <span>Risk Invariance</span>
                              <span className="font-mono font-bold text-teal-700">
                                {100 - scorecard.riskScore}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-600 rounded-full"
                                style={{ width: `${100 - scorecard.riskScore}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                          {scorecard.strengths && scorecard.strengths.length > 0 && (
                            <div>
                              <span className="font-semibold text-emerald-700 block mb-1">
                                Strengths:
                              </span>
                              <ul className="space-y-1 text-slate-600">
                                {scorecard.strengths.slice(0, 2).map((s, sIdx) => (
                                  <li key={sIdx} className="flex items-start gap-1.5">
                                    <CheckIcon className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {scorecard.weaknesses && scorecard.weaknesses.length > 0 && (
                            <div>
                              <span className="font-semibold text-slate-600 block mb-1">
                                Areas to Watch:
                              </span>
                              <ul className="space-y-1 text-slate-500">
                                {scorecard.weaknesses.slice(0, 2).map((w, wIdx) => (
                                  <li key={wIdx} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                                    <span>{w}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action footer: view full quotation */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                        {matchingQuote ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePreviewQuote(matchingQuote);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer group-hover:underline"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>View Quotation</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Quotation record unavailable</span>
                        )}
                        {matchingQuote && (
                          <span className="text-[11px] font-mono font-medium text-slate-500">
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
                  <h3 className="text-sm font-bold text-slate-900">
                    Hidden Contract & Fulfillment Risk Register
                  </h3>
                  <p className="text-xs text-slate-500">
                    Flagged payment conditions, turnaround risks, price escalation clauses, and single-source dependencies
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                  <button
                    onClick={() => setRiskSeverityFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      riskSeverityFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({riskCounts.all})
                  </button>
                  <button
                    onClick={() => setRiskSeverityFilter("high")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      riskSeverityFilter === "high"
                        ? "bg-white text-rose-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-rose-700"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>High ({riskCounts.high})</span>
                  </button>
                  <button
                    onClick={() => setRiskSeverityFilter("medium")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      riskSeverityFilter === "medium"
                        ? "bg-white text-amber-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-amber-700"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Medium ({riskCounts.medium})</span>
                  </button>
                  <button
                    onClick={() => setRiskSeverityFilter("low")}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      riskSeverityFilter === "low"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Low ({riskCounts.low})</span>
                  </button>
                </div>
              </div>

              {filteredRisks.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No risk items found matching this filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredRisks.map((risk, rIdx) => (
                    <div
                      key={rIdx}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                              risk.level === "high"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : risk.level === "medium"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {risk.level} Priority
                          </span>
                          <span
                            className="text-xs font-bold text-slate-900 truncate"
                            title={risk.affectedSupplier}
                          >
                            {risk.affectedSupplier}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 break-words">{risk.title}</h4>

                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {risk.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 6. TAB CONTENT: NEGOTIATION BATTLECARDS                  */}
          {/* ======================================================== */}
          {activeTab === "negotiation" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tactical Negotiation Leverage Battlecards
                </h3>
                <p className="text-xs text-slate-500">
                  Actionable leverage points, recommended counter-actions, and pre-drafted negotiation emails
                </p>
              </div>

              <div className="space-y-4">
                {(analysis.negotiationPoints || []).map((point, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 min-w-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Supplier Counter-Strategy ({point.quoteNumber})
                        </span>
                        <h4
                          className="text-sm font-bold text-slate-900 truncate"
                          title={point.supplierName}
                        >
                          {point.supplierName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {point.potentialImpact && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Target: {point.potentialImpact}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1">
                          Procurement Leverage Angle:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {point.leveragePoint}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[11px] font-bold text-slate-700 block mb-1">
                          Recommended Action:
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {point.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {point.draftEmailSnippet && (
                      <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MailIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                              Pre-Drafted Supplier Negotiation Email
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleCopySnippet(point.draftEmailSnippet!, pIdx)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
                          >
                            {copiedSnippetIdx === pIdx ? (
                              <>
                                <CheckIcon className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Email Copied!</span>
                              </>
                            ) : (
                              <>
                                <CopyIcon className="w-3 h-3 text-slate-400" />
                                <span>Copy Email</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-200/70 text-xs text-slate-700 font-mono leading-relaxed">
                          &ldquo;{point.draftEmailSnippet}&rdquo;
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 7. TAB CONTENT: SPLIT-SOURCING STRATEGY                 */}
          {/* ======================================================== */}
          {activeTab === "split" &&
            analysis.splitSourcing && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Multi-Vendor Split Sourcing Recommendation
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Optimize cost by awarding distinct line items to the lowest individual bidder
                    </p>
                  </div>

                  {analysis.splitSourcing.potentialSavings > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Incremental Split Savings
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-600">
                        +{formatCurrency(analysis.splitSourcing.potentialSavings)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                  {analysis.splitSourcing.summary}
                </div>

                {analysis.splitSourcing.allocations &&
                  analysis.splitSourcing.allocations.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3">Recommended Supplier</th>
                            <th className="py-2.5 px-3">Allocated Qty</th>
                            <th className="py-2.5 px-3">Unit Price</th>
                            <th className="py-2.5 px-3 text-right">
                              Savings vs High
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analysis.splitSourcing.allocations.map((alloc, aIdx) => (
                            <tr key={aIdx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {alloc.itemDescription}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-[180px] truncate inline-block align-middle"
                                  title={alloc.supplierName}
                                >
                                  {alloc.supplierName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {alloc.suggestedQty}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {formatCurrency(alloc.unitPrice, 2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                                +{formatCurrency(alloc.savingsVsHighest, 2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}

          {/* ======================================================== */}
          {/* 8. TAB CONTENT: STRATEGIC ACTION ROADMAP                 */}
          {/* ======================================================== */}
          {activeTab === "roadmap" &&
            analysis.strategicActionPlan &&
            analysis.strategicActionPlan.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Strategic Execution Roadmap
                  </h3>
                  <p className="text-xs text-slate-500">
                    Step-by-step action plan to execute the awarded contract or finalize split-vendor purchase orders
                  </p>
                </div>

                <div className="space-y-2.5">
                  {analysis.strategicActionPlan.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {sIdx + 1}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}

      {/* ======================================================== */}
      {/* 9. SUPPLIER QUOTATION DETAILS MODAL                      */}
      {/* ======================================================== */}
      {mounted && activePreviewQuote && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={() => setActivePreviewQuote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[85vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
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

            {/* Commercial Terms Grid */}
            <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
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
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Line Items Breakdown</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {activePreviewQuote.items.length} item{activePreviewQuote.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto">
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

            {/* Total Quotation Summary */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 rounded-2xl border border-indigo-100/70 flex justify-between items-center">
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
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setActivePreviewQuote(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 10. ADD / MANAGE QUOTES IN COMPARISON MODAL              */}
      {/* ======================================================== */}
      {mounted && showAddQuotesModal && selectedComparison && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
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
              Select which supplier quotations should be included in this comparison. Updating will refresh the AI Sourcing Intelligence:
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
                          setModalAddQuoteIds((prev) =>
                            prev.includes(q.id)
                              ? prev.filter((id) => id !== q.id)
                              : [...prev, q.id]
                          );
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
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
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
    </div>
  );
}
