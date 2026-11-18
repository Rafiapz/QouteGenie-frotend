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
  XIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import { Quotation, QuoteComparisonRecord } from "@/types/quotation";
import {
  createComparisonInApi,
  updateComparisonInApi,
  deleteComparisonFromApi,
} from "@/services/api";
import {
  saveLocalStoredComparisons,
  generateDefaultComparisonName,
  removeComparisonFromLocalCache,
} from "@/services/comparisonStorage";
import { formatCurrency } from "@/utils/format";
import PlanLimitModal from "@/components/common/PlanLimitModal";

interface ComparisonSidebarProps {
  comparisons: QuoteComparisonRecord[];
  allQuotations: Quotation[];
  activeComparisonId: string | null;
  onSelectComparison: (comparisonId: string | null) => void;
  onComparisonsChange: (updated: QuoteComparisonRecord[]) => void;
  onOpenUpload: () => void;
  className?: string;
  onCloseMobile?: () => void;
}

export function ComparisonSidebar({
  comparisons,
  allQuotations,
  activeComparisonId,
  onSelectComparison,
  onComparisonsChange,
  onOpenUpload,
  className,
  onCloseMobile,
}: ComparisonSidebarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessingApi, setIsProcessingApi] = useState(false);

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

  // Modal 4: Add / Manage Quotes in Comparison
  const [addQuotesTarget, setAddQuotesTarget] = useState<QuoteComparisonRecord | null>(null);
  const [addQuotesSelectedIds, setAddQuotesSelectedIds] = useState<string[]>([]);
  const [addQuotesSearch, setAddQuotesSearch] = useState("");

  const handleOpenAddQuotes = (comp: QuoteComparisonRecord) => {
    setAddQuotesTarget(comp);
    setAddQuotesSelectedIds(comp.quoteIds || []);
    setAddQuotesSearch("");
  };

  const handleConfirmAddQuotes = async () => {
    if (!addQuotesTarget || addQuotesSelectedIds.length < 2) return;
    setIsProcessingApi(true);

    try {
      await updateComparisonInApi(addQuotesTarget.id, {
        quoteIds: addQuotesSelectedIds,
      });

      const updated = comparisons.map((c) =>
        c.id === addQuotesTarget.id
          ? {
              ...c,
              quoteIds: addQuotesSelectedIds,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      onComparisonsChange(updated);
      saveLocalStoredComparisons(updated);
      onSelectComparison(addQuotesTarget.id);
      setAddQuotesTarget(null);
    } catch (err: any) {
      alert(err.message || "Failed to update comparison quotations.");
    } finally {
      setIsProcessingApi(false);
    }
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

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to extract participating suppliers string
  const getComparisonSupplierSummary = (quoteIds: string[]) => {
    const suppliers = Array.from(
      new Set(
        quoteIds
          .map((id) => allQuotations.find((q) => q.id === id)?.supplierName)
          .filter(Boolean)
      )
    );
    if (suppliers.length === 0) return "No suppliers";
    if (suppliers.length <= 2) return suppliers.join(" vs ");
    return `${suppliers[0]} vs ${suppliers[1]} +${suppliers.length - 2}`;
  };

  // Open Create Modal
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

  // Confirm Create Comparison
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
      onComparisonsChange(updated);
      saveLocalStoredComparisons(updated);
      setShowNewModal(false);
      onSelectComparison(savedInDb.id);
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
      onComparisonsChange(updated);
      saveLocalStoredComparisons(updated);
      setShowNewModal(false);
      onSelectComparison(fallbackRecord.id);
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Confirm Rename
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
    onComparisonsChange(updated);
    saveLocalStoredComparisons(updated);
    setRenameTarget(null);
    setIsProcessingApi(false);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsProcessingApi(true);

    try {
      await deleteComparisonFromApi(deleteConfirmId);
    } catch (err) {
      console.warn("Could not delete from API, removing locally:", err);
    }

    const updated = removeComparisonFromLocalCache(deleteConfirmId);
    const finalList = comparisons.filter((c) => c.id !== deleteConfirmId);
    onComparisonsChange(finalList);

    if (activeComparisonId === deleteConfirmId) {
      if (finalList.length > 0) {
        onSelectComparison(finalList[0].id);
      } else {
        onSelectComparison(null);
      }
    }

    setDeleteConfirmId(null);
    setIsProcessingApi(false);
  };

  return (
    <aside
      className={
        className ||
        "w-72 bg-white border-r border-slate-200/90 hidden md:flex flex-col fixed left-0 top-16 bottom-0 z-30 select-none overflow-hidden"
      }
    >
      {/* 1. Header Toolbar */}
      <div className="p-3.5 border-b border-slate-100 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Sourcing Scenarios
            </span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
              {comparisons.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenCreateModal}
              disabled={allQuotations.length < 2}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Create a new comparison project"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 md:hidden cursor-pointer"
                title="Close"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scenarios..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* 2. Scrollable Comparisons List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 divide-y divide-slate-100/60">
        {/* Special Item: Global All Quotations Benchmark */}
        <div className="pb-1">
          <div
            onClick={() => {
              onSelectComparison("all");
              onCloseMobile?.();
            }}
            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
              activeComparisonId === "all"
                ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold shadow-2xs"
                : "bg-white hover:bg-slate-50 border-slate-200/70 text-slate-700"
            }`}
          >
            <span className="text-base shrink-0 mt-0.5">🌐</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold truncate text-slate-900 text-xs">
                  Global Sourcing Baseline
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-200/70 text-slate-700 shrink-0">
                  {allQuotations.length} quotes
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                All uploaded vendor quotations
              </p>
            </div>
          </div>
        </div>

        {/* Section Label: Saved Scenarios */}
        <div className="pt-2">
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Saved Scenarios</span>
            <span>{filteredComparisons.length}</span>
          </div>

          {filteredComparisons.length === 0 ? (
            <div className="text-center py-6 px-3 text-xs text-slate-400">
              {searchQuery ? (
                "No matching comparisons found."
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    No custom comparisons saved yet.
                  </p>
                  <button
                    onClick={handleOpenCreateModal}
                    disabled={allQuotations.length < 2}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <PlusIcon className="w-3 h-3" />
                    <span>Create Comparison</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {filteredComparisons.map((comp) => {
                const isActive = activeComparisonId === comp.id;
                const matchedQuotes = allQuotations.filter((q) =>
                  comp.quoteIds?.includes(q.id)
                );
                const supplierSummary = getComparisonSupplierSummary(
                  comp.quoteIds || []
                );

                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      onSelectComparison(comp.id);
                      onCloseMobile?.();
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-1.5 group relative ${
                      isActive
                        ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold shadow-2xs"
                        : "bg-white hover:bg-slate-50 border-slate-200/70 text-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <FolderIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? "text-indigo-600" : "text-slate-400"
                          }`}
                        />
                        <span
                          className="font-bold text-slate-900 truncate text-xs"
                          title={comp.name}
                        >
                          {comp.name}
                        </span>
                      </div>

                      {/* Quick Add/Rename/Delete Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddQuotes(comp);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                          title="Add or manage quotes in this comparison"
                        >
                          <PlusIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTarget(comp);
                            setRenameNewName(comp.name);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded"
                          title="Rename"
                        >
                          <PencilIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(comp.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span className="truncate max-w-[150px]" title={supplierSummary}>
                        {supplierSummary}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">
                        {matchedQuotes.length} quotes • {formatDate(comp.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select 2 or more quotations to save as a distinct comparison project.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Project Title <span className="text-rose-500">*</span>
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
                  Select Quotes ({newModalSelectedQuoteIds.length} selected)
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
                  Rename Comparison
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
                {isProcessingApi ? "Saving..." : "Save"}
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
                  This comparison project will be removed from your database.
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
                {isProcessingApi ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD / MANAGE QUOTES IN COMPARISON               */}
      {/* ======================================================== */}
      {mounted && addQuotesTarget && createPortal(
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
                  <p className="text-xs text-slate-500 font-medium truncate max-w-xs" title={addQuotesTarget.name}>
                    Project: <span className="text-indigo-600 font-semibold">{addQuotesTarget.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddQuotesTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 shrink-0">
              Select which supplier quotations should be included in this comparison project:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {allQuotations.map((q) => {
                const isChecked = addQuotesSelectedIds.includes(q.id);
                const wasOriginallyIncluded = (addQuotesTarget.quoteIds || []).includes(q.id);

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
                          setAddQuotesSelectedIds((prev) =>
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
                Selected: <span className="font-bold text-slate-900">{addQuotesSelectedIds.length}</span> quotes (min 2)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddQuotesTarget(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddQuotes}
                  disabled={isProcessingApi || addQuotesSelectedIds.length < 2}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  {isProcessingApi ? "Saving..." : "Update Comparison"}
                </button>
              </div>
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
    </aside>
  );
}
