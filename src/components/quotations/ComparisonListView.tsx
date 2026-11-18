"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FolderIcon,
  ScaleIcon,
  SparklesIcon,
  PlusIcon,
  SearchIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  TrendingDownIcon,
  XIcon,
  AlertTriangleIcon,
  UploadCloudIcon,
  DocumentTextIcon,
} from "@/components/Icons";
import { Quotation, QuoteComparisonRecord } from "@/types/quotation";
import {
  getComparisonsFromApi,
  createComparisonInApi,
  updateComparisonInApi,
  deleteComparisonFromApi,
} from "@/services/api";
import {
  getLocalStoredComparisons,
  saveLocalStoredComparisons,
  generateDefaultComparisonName,
  truncateText,
  removeComparisonFromLocalCache,
} from "@/services/comparisonStorage";
import { formatCurrency } from "@/utils/format";
import PlanLimitModal from "@/components/common/PlanLimitModal";

interface ComparisonListViewProps {
  allQuotations: Quotation[];
  onSelectComparison: (
    comparisonId: string,
    targetView?: "compare" | "ai_analysis"
  ) => void;
  onOpenUpload: () => void;
  title?: string;
  subtitle?: string;
  defaultActionView?: "compare" | "ai_analysis";
  comparisons?: QuoteComparisonRecord[];
  onComparisonsChange?: (records: QuoteComparisonRecord[]) => void;
}

export function ComparisonListView({
  allQuotations,
  onSelectComparison,
  onOpenUpload,
  title = "Quotation Comparison Projects",
  subtitle = "Select a saved comparison project below to launch comparative charts, price breakdown, and strategic AI intelligence, or create a new comparison.",
  defaultActionView = "compare",
  comparisons: comparisonsProp,
  onComparisonsChange,
}: ComparisonListViewProps) {
  // Comparisons list state (uses prop if available, otherwise internal state)
  const [internalComparisons, setInternalComparisons] = useState<
    QuoteComparisonRecord[]
  >([]);

  const comparisons = comparisonsProp !== undefined ? comparisonsProp : internalComparisons;
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessingApi, setIsProcessingApi] = useState(false);

  const updateComparisons = (updated: QuoteComparisonRecord[]) => {
    setInternalComparisons(updated);
    saveLocalStoredComparisons(updated);
    onComparisonsChange?.(updated);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal 1: Create New Comparison
  const [showNewModal, setShowNewModal] = useState(false);
  const [newModalName, setNewModalName] = useState("");
  const [newModalSelectedQuoteIds, setNewModalSelectedQuoteIds] = useState<
    string[]
  >([]);
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

  // Modal 2: Rename Comparison
  const [renameTarget, setRenameTarget] = useState<QuoteComparisonRecord | null>(
    null
  );
  const [renameNewName, setRenameNewName] = useState("");

  // Modal 3: Delete Confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 1. Fetch comparisons from API on mount ONLY if not provided by parent
  useEffect(() => {
    if (comparisonsProp !== undefined) return;
    let isMounted = true;
    const cached = getLocalStoredComparisons();
    if (cached.length > 0) {
      setInternalComparisons(cached);
    }

    getComparisonsFromApi()
      .then((records) => {
        if (!isMounted) return;
        if (Array.isArray(records)) {
          setInternalComparisons(records);
          saveLocalStoredComparisons(records);
        }
      })
      .catch((err) => {
        console.warn("Could not sync comparisons from API, using local storage:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [comparisonsProp]);

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

  // Helper to extract participating quotes for a comparison record
  const getQuotesForComparison = (quoteIds: string[]) => {
    return allQuotations.filter((q) => quoteIds.includes(q.id));
  };

  // Filter comparisons by search query
  const filteredComparisons = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return comparisons;

    return comparisons.filter((comp) => {
      if (comp.name.toLowerCase().includes(q)) return true;
      const matchedQuotes = allQuotations.filter((quote) =>
        comp.quoteIds?.includes(quote.id)
      );
      return matchedQuotes.some(
        (quote) =>
          quote.supplierName.toLowerCase().includes(q) ||
          quote.quoteNumber.toLowerCase().includes(q)
      );
    });
  }, [comparisons, searchQuery, allQuotations]);

  // Handle opening Create Comparison Modal
  const handleOpenCreateModal = () => {
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
    setNewModalSelectedQuoteIds(initialQuotes.map((q) => q.id));
    setNewModalName(generateDefaultComparisonName(initialQuotes));
    setShowNewModal(true);
  };

  // Handle creating comparison
  const handleConfirmCreateComparison = async () => {
    if (newModalSelectedQuoteIds.length < 2) return;
    if (newModalSelectedQuoteIds.length > 3) {
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Limit Exceeded",
        message: "You can only compare up to 3 quotations at a time on the Free plan.",
        limitType: "quotes_per_comparison",
      });
      return;
    }
    if (comparisons.length >= 3) {
      setShowNewModal(false);
      setPlanLimitModal({
        isOpen: true,
        title: "Comparison Limit Reached",
        message: "You have reached the maximum limit of 3 comparisons on the Free plan. To create a new comparison, please delete an existing one or upgrade your account.",
        limitType: "comparisons",
      });
      return;
    }
    setIsProcessingApi(true);

    const quotes = allQuotations.filter((q) =>
      newModalSelectedQuoteIds.includes(q.id)
    );
    const finalName =
      newModalName.trim() || generateDefaultComparisonName(quotes);

    try {
      const savedInDb = await createComparisonInApi({
        name: finalName,
        quoteIds: newModalSelectedQuoteIds,
      });

      const updated = [savedInDb, ...comparisons.filter((c) => c.id !== savedInDb.id)];
      updateComparisons(updated);
      setShowNewModal(false);

      // Immediately select and launch the newly created comparison
      onSelectComparison(savedInDb.id, defaultActionView);
    } catch (err: any) {
      if (
        err.status === 403 ||
        err.message?.toLowerCase().includes("free plan") ||
        err.message?.toLowerCase().includes("limit")
      ) {
        setShowNewModal(false);
        setPlanLimitModal({
          isOpen: true,
          title: "Free Plan Limit",
          message: err.message || "You have reached the limits of the Free plan.",
          limitType: err.message?.toLowerCase().includes("3 quotation")
            ? "quotes_per_comparison"
            : "comparisons",
        });
        return;
      }
      console.error("Failed to save comparison to DB, using local fallback:", err);
      const fallbackRecord: QuoteComparisonRecord = {
        id: `local_comp_${Date.now()}`,
        organizationId: "org-local",
        name: finalName,
        quoteIds: newModalSelectedQuoteIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [fallbackRecord, ...comparisons];
      updateComparisons(updated);
      setShowNewModal(false);
      onSelectComparison(fallbackRecord.id, defaultActionView);
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Handle Renaming
  const handleConfirmRename = async () => {
    if (!renameTarget || !renameNewName.trim()) return;
    setIsProcessingApi(true);
    const trimmed = renameNewName.trim();

    try {
      await updateComparisonInApi(renameTarget.id, { name: trimmed });
    } catch (err) {
      console.warn("Could not rename in API, updating locally:", err);
    }

    const updated = comparisons.map((c) =>
      c.id === renameTarget.id
        ? { ...c, name: trimmed, updatedAt: new Date().toISOString() }
        : c
    );
    updateComparisons(updated);
    setRenameTarget(null);
    setIsProcessingApi(false);
  };

  // Handle Deleting
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessingApi(true);

    try {
      await deleteComparisonFromApi(deleteConfirmId);
    } catch (err) {
      console.warn("Could not delete from API, removing locally:", err);
    }

    removeComparisonFromLocalCache(deleteConfirmId);
    const updated = comparisons.filter((c) => c.id !== deleteConfirmId);
    updateComparisons(updated);
    setDeleteConfirmId(null);
    setIsProcessingApi(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0 mt-0.5">
              <FolderIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              disabled={allQuotations.length < 2}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create New Comparison</span>
            </button>
          </div>
        </div>

        {/* Search and stats bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comparison projects or suppliers..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 font-mono">
              {comparisons.length}
            </span>{" "}
            saved comparison projects •{" "}
            <span className="font-semibold text-slate-700 font-mono">
              {allQuotations.length}
            </span>{" "}
            total quotations
          </div>
        </div>
      </div>

      {/* 2. Global "All Quotations Benchmark" Featured Card */}
      {allQuotations.length >= 2 && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/10">
                  <span>🌐</span>
                  <span>GLOBAL ORGANIZATION BENCHMARK</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-500/30">
                  {allQuotations.length} Quotes
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                All Quotations Complete Benchmark
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Audit and cross-compare all {allQuotations.length} uploaded
                quotations across your entire supplier catalog to uncover global
                cost dispersion and cross-vendor pricing anomalies.
              </p>

              {/* Unique suppliers preview */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from(new Set(allQuotations.map((q) => q.supplierName)))
                  .slice(0, 5)
                  .map((sup, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 text-slate-200 truncate max-w-[140px]"
                      title={sup}
                    >
                      {sup}
                    </span>
                  ))}
                {Array.from(new Set(allQuotations.map((q) => q.supplierName))).length > 5 && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/10 text-slate-300">
                    +{Array.from(new Set(allQuotations.map((q) => q.supplierName))).length - 5} more
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => onSelectComparison("all", "compare")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ScaleIcon className="w-4 h-4 text-indigo-600" />
                <span>Compare All Quotes</span>
              </button>
              <button
                onClick={() => onSelectComparison("all", "ai_analysis")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-300" />
                <span>Run Global AI Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Comparisons Cards Grid */}
      {filteredComparisons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <FolderIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {searchQuery
                ? `No comparison projects match "${searchQuery}"`
                : "No Custom Comparisons Saved Yet"}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {searchQuery
                ? "Try searching for a different project title or supplier name."
                : "Create targeted comparison sets to evaluate specific vendors, head-to-head bids, or project RFPs side-by-side."}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            disabled={allQuotations.length < 2}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Comparison Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredComparisons.map((comp) => {
            const matchedQuotes = getQuotesForComparison(comp.quoteIds || []);
            const amounts = matchedQuotes.map((q) => q.totalAmount);
            const minAmount = amounts.length > 0 ? Math.min(...amounts) : 0;
            const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
            const varianceAmount = maxAmount - minAmount;
            const variancePercent =
              maxAmount > 0 ? Math.round((varianceAmount / maxAmount) * 100) : 0;

            return (
              <div
                key={comp.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Card Top: Title, Date, Actions */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <FolderIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className="font-bold text-sm text-slate-900 truncate"
                          title={comp.name}
                        >
                          {comp.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Saved {formatDate(comp.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons: Rename & Delete */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setRenameTarget(comp);
                          setRenameNewName(comp.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Rename Comparison"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(comp.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Comparison"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Participating Suppliers Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Compared Suppliers ({matchedQuotes.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedQuotes.map((q) => (
                        <div
                          key={q.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 max-w-[180px] truncate"
                          title={`${q.supplierName} (${formatCurrency(q.totalAmount)})`}
                        >
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {q.supplierName.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate font-medium text-[11px]">
                            {q.supplierName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range & Variance Preview */}
                  {amounts.length >= 2 && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          Quoted Price Range
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {formatCurrency(minAmount)} — {formatCurrency(maxAmount)}
                        </span>
                      </div>
                      {varianceAmount > 0 && (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Max Bid Spread</span>
                          <span className="font-mono font-bold text-emerald-700">
                            +{formatCurrency(varianceAmount)} ({variancePercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Bottom CTA Buttons */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSelectComparison(comp.id, "compare")}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <ScaleIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Compare</span>
                  </button>
                  <button
                    onClick={() => onSelectComparison(comp.id, "ai_analysis")}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    <SparklesIcon className="w-3.5 h-3.5 text-emerald-300" />
                    <span>AI Analysis</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE NEW COMPARISON                           */}
      {/* ======================================================== */}
      {mounted && showNewModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Create Comparison Project
                </h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select 2 or more quotations to save as a distinct comparison project.
              You can reopen it anytime to review comparative charts and strategic AI intelligence.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Comparison Project Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newModalName}
                  onChange={(e) => setNewModalName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newModalSelectedQuoteIds.length >= 2 && !isProcessingApi && newModalName.trim()) {
                      e.preventDefault();
                      handleConfirmCreateComparison();
                    }
                  }}
                  placeholder="e.g. Acme vs Beta Precision Sourcing"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Select Quotes to Compare ({newModalSelectedQuoteIds.length} selected)
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {allQuotations.map((q) => {
                    const isChecked = newModalSelectedQuoteIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors gap-3 ${
                          isChecked
                            ? "bg-white border-indigo-500 shadow-2xs"
                            : "bg-white/60 border-slate-200 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setNewModalSelectedQuoteIds((prev) => {
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
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className="font-semibold text-slate-900 block truncate"
                              title={q.supplierName}
                            >
                              {q.supplierName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {q.quoteNumber} • {q.deliveryLeadTime}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono font-bold text-slate-900 shrink-0">
                          {formatCurrency(q.totalAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateComparison}
                disabled={isProcessingApi || newModalSelectedQuoteIds.length < 2}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
              >
                {isProcessingApi ? "Saving..." : "Save & Open Comparison"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RENAME COMPARISON                               */}
      {/* ======================================================== */}
      {mounted && renameTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PencilIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Rename Comparison Project
                </h3>
              </div>
              <button
                onClick={() => setRenameTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRenameTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={isProcessingApi || !renameNewName.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {isProcessingApi ? "Saving..." : "Save Name"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {mounted && deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Comparison?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This comparison project will be removed from your database. The
                  original quotations will remain safe.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isProcessingApi}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {isProcessingApi ? "Deleting..." : "Delete Comparison"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
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
