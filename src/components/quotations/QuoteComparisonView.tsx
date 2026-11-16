"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ScaleIcon,
  ClockIcon,
  UploadCloudIcon,
  CheckIcon,
  SparklesIcon,
  TrendingDownIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FolderIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  XIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import { Quotation, QuoteComparisonRecord } from "@/types/quotation";
import {
  getComparisonsFromApi,
  createComparisonInApi,
  updateComparisonInApi,
  deleteComparisonFromApi,
} from "@/services/api";
import {
  generateDefaultComparisonName,
  getLocalStoredComparisons,
  saveLocalStoredComparisons,
  removeComparisonFromLocalCache,
} from "@/services/comparisonStorage";
import { formatCurrency } from "@/utils/format";

interface QuoteComparisonViewProps {
  allQuotations: Quotation[];
  initialSelectedIds?: string[];
  initialComparisonId?: string | null;
  onOpenUpload: () => void;
  onNavigateToAnalysis?: (
    quoteIds?: string[],
    comparisonId?: string | null,
  ) => void;
  onComparisonChange?: (comparisonId: string | null) => void;
}

type ComparisonTab = "overview" | "item_variance" | "tradeoff" | "table";

// Distinct color accents for comparing different suppliers
const SUPPLIER_COLORS = [
  {
    bg: "bg-emerald-500",
    text: "text-emerald-700",
    border: "border-emerald-500",
    light: "bg-emerald-50",
    fill: "#10b981",
  },
  {
    bg: "bg-indigo-500",
    text: "text-indigo-700",
    border: "border-indigo-500",
    light: "bg-indigo-50",
    fill: "#6366f1",
  },
  {
    bg: "bg-sky-500",
    text: "text-sky-700",
    border: "border-sky-500",
    light: "bg-sky-50",
    fill: "#0ea5e9",
  },
  {
    bg: "bg-amber-500",
    text: "text-amber-700",
    border: "border-amber-500",
    light: "bg-amber-50",
    fill: "#f59e0b",
  },
  {
    bg: "bg-purple-500",
    text: "text-purple-700",
    border: "border-purple-500",
    light: "bg-purple-50",
    fill: "#a855f7",
  },
  {
    bg: "bg-rose-500",
    text: "text-rose-700",
    border: "border-rose-500",
    light: "bg-rose-50",
    fill: "#f43f5e",
  },
];

export function QuoteComparisonView({
  allQuotations,
  initialSelectedIds = [],
  initialComparisonId = null,
  onOpenUpload,
  onNavigateToAnalysis,
  onComparisonChange,
}: QuoteComparisonViewProps) {
  const [activeViewTab, setActiveViewTab] = useState<ComparisonTab>("overview");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Database comparison records state
  const [comparisons, setComparisons] = useState<QuoteComparisonRecord[]>(
    () => {
      return getLocalStoredComparisons();
    },
  );
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(
    initialComparisonId,
  );
  const [isLoadingComparisons, setIsLoadingComparisons] = useState(false);
  const [comparisonNotice, setComparisonNotice] = useState<string | null>(null);

  // Sync with initialComparisonId if prop changes
  const prevInitialIdRef = useRef<string | null | undefined>(initialComparisonId);
  useEffect(() => {
    if (prevInitialIdRef.current !== initialComparisonId) {
      prevInitialIdRef.current = initialComparisonId;
      setActiveComparisonId(initialComparisonId);
      if (initialComparisonId === "all") {
        setSelectedIds(allQuotations.map((q) => q.id));
      } else if (initialComparisonId) {
        const comp = comparisons.find((c) => c.id === initialComparisonId);
        if (comp && comp.quoteIds?.length) {
          const valid = comp.quoteIds.filter((id) =>
            allQuotations.some((q) => q.id === id)
          );
          if (valid.length > 0) {
            setSelectedIds(valid);
          }
        }
      }
    }
  }, [initialComparisonId, comparisons, allQuotations]);

  // Selection of quotes to compare
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedIds.length >= 2) return initialSelectedIds;
    if (allQuotations.length >= 2) return allQuotations.map((q) => q.id);
    return allQuotations.map((q) => q.id);
  });

  // Modals state
  const [showNewModal, setShowNewModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newComparisonName, setNewComparisonName] = useState("");
  const [newComparisonDescription, setNewComparisonDescription] = useState("");
  const [newModalSelectedQuoteIds, setNewModalSelectedQuoteIds] = useState<
    string[]
  >([]);
  const [renameTarget, setRenameTarget] =
    useState<QuoteComparisonRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAddQuotesModal, setShowAddQuotesModal] = useState(false);
  const [modalAddQuoteIds, setModalAddQuoteIds] = useState<string[]>([]);
  const [isProcessingApi, setIsProcessingApi] = useState(false);

  // Track auto-saved combinations to prevent redundant saves in the same session
  const autoSavedRef = useRef<Set<string>>(new Set());

  // Show temporary notification
  const showNotice = (msg: string) => {
    setComparisonNotice(msg);
    setTimeout(() => {
      setComparisonNotice(null);
    }, 3500);
  };

  // 1. Fetch comparisons from PostgreSQL API on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingComparisons(true);

    getComparisonsFromApi()
      .then((records) => {
        if (!isMounted) return;
        if (Array.isArray(records)) {
          setComparisons(records);
          saveLocalStoredComparisons(records);
        }
      })
      .catch((err) => {
        console.warn(
          "Could not load comparisons from API, using cached records:",
          err,
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingComparisons(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Auto-save comparison to DB when 2+ quotes are passed explicitly from quotations list
  useEffect(() => {
    if (allQuotations.length < 2) return;
    if (selectedIds.length < 2) return;
    // Only auto-save if user explicitly passed initialSelectedIds (e.g. from quotations list selection)
    if (!initialSelectedIds || initialSelectedIds.length < 2) return;

    // Check if an existing comparison in DB already has these exact quote IDs
    const currentSorted = [...selectedIds].sort().join(",");
    const matching = comparisons.find((c) => {
      const cSorted = [...(c.quoteIds || [])].sort().join(",");
      return cSorted === currentSorted;
    });

    if (matching) {
      if (activeComparisonId !== matching.id) {
        setActiveComparisonId(matching.id);
      }
      return;
    }

    // If not matching and not yet auto-saved in this session, save to database!
    if (!autoSavedRef.current.has(currentSorted)) {
      autoSavedRef.current.add(currentSorted);

      const quotesToCompare = allQuotations.filter((q) =>
        selectedIds.includes(q.id),
      );
      const autoName = generateDefaultComparisonName(quotesToCompare);

      createComparisonInApi({
        name: autoName,
        quoteIds: selectedIds,
      })
        .then((created) => {
          if (created && created.id) {
            setComparisons((prev) => {
              const updated = [
                created,
                ...prev.filter((c) => c.id !== created.id),
              ];
              saveLocalStoredComparisons(updated);
              return updated;
            });
            setActiveComparisonId(created.id);
            showNotice(`Comparison "${created.name}" saved to database.`);
          }
        })
        .catch((err) => {
          console.warn("Auto-save comparison error:", err);
        });
    }
  }, [selectedIds, comparisons, allQuotations, activeComparisonId]);


  // Active comparison record lookup
  const activeComparison = useMemo(() => {
    if (!activeComparisonId || activeComparisonId === "all") return null;
    return comparisons.find((c) => c.id === activeComparisonId) || null;
  }, [activeComparisonId, comparisons]);

  // Quotes filtered by active selection
  const comparedQuotes = useMemo(() => {
    if (activeComparisonId === "all") return allQuotations;
    return allQuotations.filter((q) => selectedIds.includes(q.id));
  }, [allQuotations, selectedIds, activeComparisonId]);

  // Switch to a specific saved comparison
  const handleSelectComparison = (comp: QuoteComparisonRecord | null) => {
    if (!comp) {
      // Switch to All Quotations
      setActiveComparisonId(null);
      setSelectedIds(allQuotations.map((q) => q.id));
      showNotice("Viewing comparison across all quotations.");
      return;
    }

    setActiveComparisonId(comp.id);
    const validQuoteIds = comp.quoteIds.filter((id) =>
      allQuotations.some((q) => q.id === id),
    );
    setSelectedIds(
      validQuoteIds.length > 0 ? validQuoteIds : allQuotations.map((q) => q.id),
    );
    showNotice(`Switched to comparison "${comp.name}".`);
  };

  // Open "Create New Comparison" modal
  const handleOpenCreateModal = () => {
    const defaultIds =
      selectedIds.length >= 2
        ? selectedIds
        : allQuotations.slice(0, 2).map((q) => q.id);
    const quotes = allQuotations.filter((q) => defaultIds.includes(q.id));
    setNewModalSelectedQuoteIds(defaultIds);
    setNewComparisonName(generateDefaultComparisonName(quotes));
    setNewComparisonDescription("");
    setShowNewModal(true);
  };

  // Save new comparison to database
  const handleConfirmCreateComparison = async () => {
    if (newModalSelectedQuoteIds.length < 2) {
      alert("Please select at least 2 quotations to compare.");
      return;
    }

    const name =
      newComparisonName.trim() ||
      `Comparison (${new Date().toLocaleDateString()})`;
    setIsProcessingApi(true);

    try {
      const created = await createComparisonInApi({
        name,
        description: newComparisonDescription.trim() || undefined,
        quoteIds: newModalSelectedQuoteIds,
      });

      const updated = [
        created,
        ...comparisons.filter((c) => c.id !== created.id),
      ];
      setComparisons(updated);
      saveLocalStoredComparisons(updated);
      setActiveComparisonId(created.id);
      setSelectedIds(created.quoteIds);
      setShowNewModal(false);
      showNotice(`Comparison "${created.name}" created and saved.`);
    } catch (err: any) {
      alert(err.message || "Failed to save comparison to database.");
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Open rename modal
  const handleOpenRename = (comp: QuoteComparisonRecord) => {
    setRenameTarget(comp);
    setRenameValue(comp.name);
    setShowRenameModal(true);
  };

  // Confirm rename in database
  const handleConfirmRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setIsProcessingApi(true);

    try {
      const updated = await updateComparisonInApi(renameTarget.id, {
        name: renameValue.trim(),
      });

      setComparisons((prev) => {
        const next = prev.map((c) => (c.id === updated.id ? updated : c));
        saveLocalStoredComparisons(next);
        return next;
      });
      setShowRenameModal(false);
      showNotice("Comparison renamed successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to rename comparison.");
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Confirm delete from database
  const handleConfirmDelete = async (id: string) => {
    setIsProcessingApi(true);
    try {
      await deleteComparisonFromApi(id);
      removeComparisonFromLocalCache(id);
      setComparisons((prev) => {
        const next = prev.filter((c) => c.id !== id);
        return next;
      });

      if (activeComparisonId === id) {
        setActiveComparisonId(null);
        setSelectedIds(allQuotations.map((q) => q.id));
      }

      setDeleteConfirmId(null);
      showNotice("Comparison deleted from database.");
    } catch (err: any) {
      alert(err.message || "Failed to delete comparison.");
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Toggle quote in/out of comparison
  const toggleQuote = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      return next;
    });
  };

  // Open modal to add/remove quotes from active comparison
  const handleOpenAddQuotesModal = () => {
    if (!activeComparison) return;
    setModalAddQuoteIds(activeComparison.quoteIds || selectedIds);
    setShowAddQuotesModal(true);
  };

  // Confirm updating quotations in active comparison via modal
  const handleConfirmModalAddQuotes = async () => {
    if (!activeComparison || modalAddQuoteIds.length < 2) return;
    setIsProcessingApi(true);
    try {
      const updatedRecord = await updateComparisonInApi(activeComparison.id, {
        quoteIds: modalAddQuoteIds,
      });

      const updatedList = comparisons.map((c) =>
        c.id === updatedRecord.id ? updatedRecord : c
      );
      setComparisons(updatedList);
      saveLocalStoredComparisons(updatedList);
      setSelectedIds(modalAddQuoteIds);
      setShowAddQuotesModal(false);
      showNotice(
        `Updated "${activeComparison.name}" with ${modalAddQuoteIds.length} quotations.`
      );
    } catch (err: any) {
      alert(err.message || "Failed to update comparison.");
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Update existing active comparison directly with current selected quote IDs
  const handleUpdateCurrentComparisonQuotes = async () => {
    if (!activeComparison || selectedIds.length < 2) {
      alert("Select at least 2 quotes to save into this comparison.");
      return;
    }

    setIsProcessingApi(true);
    try {
      const updatedRecord = await updateComparisonInApi(activeComparison.id, {
        quoteIds: selectedIds,
      });

      const updatedList = comparisons.map((c) =>
        c.id === updatedRecord.id ? updatedRecord : c
      );
      setComparisons(updatedList);
      saveLocalStoredComparisons(updatedList);
      showNotice(
        `Saved changes to "${activeComparison.name}" (${selectedIds.length} quotations).`
      );
    } catch (err: any) {
      alert(err.message || "Failed to update comparison.");
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Quick save current modified selection as a new comparison project
  const handleSaveCurrentSelection = async () => {
    if (selectedIds.length < 2) {
      alert("Select at least 2 quotes to save a comparison.");
      return;
    }
    const quotes = allQuotations.filter((q) => selectedIds.includes(q.id));
    const name = generateDefaultComparisonName(quotes);

    setIsProcessingApi(true);
    try {
      const created = await createComparisonInApi({
        name,
        quoteIds: selectedIds,
      });

      const updated = [
        created,
        ...comparisons.filter((c) => c.id !== created.id),
      ];
      setComparisons(updated);
      saveLocalStoredComparisons(updated);
      setActiveComparisonId(created.id);
      showNotice(`Comparison "${created.name}" saved to database.`);
    } catch (err: any) {
      alert(err.message || "Failed to save comparison.");
    } finally {
      setIsProcessingApi(false);
    }
  };

  // Comparative calculations & analytics
  const analysis = useMemo(() => {
    if (comparedQuotes.length === 0) return null;

    const sortedByPrice = [...comparedQuotes].sort(
      (a, b) => a.totalAmount - b.totalAmount,
    );
    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];

    const maxSavingsAmount = mostExpensive.totalAmount - cheapest.totalAmount;
    const maxSavingsPercent =
      mostExpensive.totalAmount > 0
        ? Math.round((maxSavingsAmount / mostExpensive.totalAmount) * 100)
        : 0;

    const sortedByDelivery = [...comparedQuotes].sort(
      (a, b) => a.deliveryDays - b.deliveryDays,
    );
    const fastest = sortedByDelivery[0];

    const averageCost =
      comparedQuotes.reduce((sum, q) => sum + q.totalAmount, 0) /
      comparedQuotes.length;

    // Map unique line items across all quotations for cross-supplier item benchmarking
    const itemMap = new Map<
      string,
      {
        description: string;
        sku?: string;
        unit: string;
        quotes: {
          [quoteId: string]: {
            supplierName: string;
            unitPrice: number;
            totalPrice: number;
            qty: number;
          };
        };
      }
    >();

    comparedQuotes.forEach((q) => {
      q.items.forEach((item) => {
        const key = item.description.trim().toLowerCase();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            description: item.description,
            sku: item.sku,
            unit: item.unit,
            quotes: {},
          });
        }
        itemMap.get(key)!.quotes[q.id] = {
          supplierName: q.supplierName,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          qty: item.quantity,
        };
      });
    });

    const uniqueItems = Array.from(itemMap.values());
    const totalScopeItems = uniqueItems.length;

    // Cross-quote missing items analysis
    const quoteMissingMap = new Map<string, string[]>();
    if (comparedQuotes.length > 1 && totalScopeItems > 0) {
      comparedQuotes.forEach((q) => {
        const presentKeys = new Set(
          q.items.map((i) => i.description.trim().toLowerCase())
        );
        const missing: string[] = [];
        uniqueItems.forEach((u) => {
          if (!presentKeys.has(u.description.trim().toLowerCase())) {
            missing.push(u.description);
          }
        });
        quoteMissingMap.set(q.id, missing);
      });
    }

    // Max values for chart axes normalization
    const maxTotalAmount = Math.max(
      ...comparedQuotes.map((q) => q.totalAmount),
      1,
    );
    const maxDeliveryDays = Math.max(
      ...comparedQuotes.map((q) => q.deliveryDays),
      1,
    );

    return {
      cheapest,
      mostExpensive,
      maxSavingsAmount,
      maxSavingsPercent,
      fastest,
      averageCost,
      uniqueItems,
      totalScopeItems,
      quoteMissingMap,
      maxTotalAmount,
      maxDeliveryDays,
    };
  }, [comparedQuotes]);

  // Color mapping index per supplier
  const supplierColorMap = useMemo(() => {
    const map = new Map<string, (typeof SUPPLIER_COLORS)[0]>();
    comparedQuotes.forEach((q, idx) => {
      map.set(q.id, SUPPLIER_COLORS[idx % SUPPLIER_COLORS.length]);
    });
    return map;
  }, [comparedQuotes]);

  // Is current selection different from the active saved comparison project?
  const isSelectionModified = useMemo(() => {
    if (!activeComparison) return selectedIds.length < allQuotations.length;
    const a = [...(activeComparison.quoteIds || [])].sort().join(",");
    const b = [...selectedIds].sort().join(",");
    return a !== b;
  }, [activeComparison, selectedIds, allQuotations]);

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

  // Helper to get supplier names for a comparison record
  const getComparisonSupplierNames = (quoteIds: string[]) => {
    const names = quoteIds
      .map((id) => allQuotations.find((q) => q.id === id)?.supplierName)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : `${quoteIds.length} quotes`;
  };


  // ---------------------------------------------------------------------------
  // Empty State: 0 quotations
  // ---------------------------------------------------------------------------
  if (allQuotations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
          <ChartBarIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          No Quotations to Compare
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
          Upload at least 2 supplier quotation PDFs to automatically view
          side-by-side cost comparison charts, item price variance, and
          lead-time analytics.
        </p>
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UploadCloudIcon className="w-4 h-4" />
          <span>Upload First Quotation</span>
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty State: 1 quotation
  // ---------------------------------------------------------------------------
  if (allQuotations.length === 1) {
    const singleQuote = allQuotations[0];
    return (
      <div className="space-y-4 max-w-2xl mx-auto my-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ScaleIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm font-bold text-slate-900 truncate"
                title={`1 Quotation Stored (${singleQuote.supplierName})`}
              >
                1 Quotation Stored ({singleQuote.supplierName})
              </h3>
              <p className="text-xs text-slate-500">
                Upload at least one more quotation to unlock comparative charts
                and trade-off analysis.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 mb-5 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 block font-mono">
                {singleQuote.quoteNumber}
              </span>
              <span
                className="font-semibold text-slate-800 block truncate"
                title={singleQuote.supplierName}
              >
                {singleQuote.supplierName}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">
                Total Quoted
              </span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {formatCurrency(singleQuote.totalAmount)}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloudIcon className="w-4 h-4" />
            <span>Upload Second Quotation to Compare</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner */}
      {comparisonNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{comparisonNotice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. ACTIVE COMPARISON CONTEXT HEADER                      */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active Comparison Title & Meta */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <FolderIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h2
                  className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
                  title={
                    activeComparison
                      ? activeComparison.name
                      : "All Quotations Benchmark"
                  }
                >
                  {activeComparison
                    ? activeComparison.name
                    : "All Quotations Benchmark"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                  {activeComparisonId === "all" || !activeComparison
                    ? "Global Benchmark"
                    : "Saved in DB"}
                </span>
                {isSelectionModified && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    Custom Selection
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {activeComparison ? (
                  <>
                    Created on {formatDate(activeComparison.createdAt)} •{" "}
                    {comparedQuotes.length} quotes compared
                  </>
                ) : (
                  <>
                    Comprehensive benchmark across all {allQuotations.length}{" "}
                    uploaded quotations
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Context Actions */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
            {activeComparison && (
              <button
                onClick={handleOpenAddQuotesModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                title={`Add more quotations to "${activeComparison.name}"`}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Quotation</span>
              </button>
            )}

            {isSelectionModified && activeComparison && selectedIds.length >= 2 && (
              <button
                onClick={handleUpdateCurrentComparisonQuotes}
                disabled={isProcessingApi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                title={`Save updated selection to "${activeComparison.name}"`}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Update "{activeComparison.name}"</span>
              </button>
            )}

            {onNavigateToAnalysis && (
              <button
                onClick={() =>
                  onNavigateToAnalysis(selectedIds, activeComparisonId)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Strategic Analysis</span>
                <span>→</span>
              </button>
            )}

            {isSelectionModified && selectedIds.length >= 2 && (
              <button
                onClick={handleSaveCurrentSelection}
                disabled={isProcessingApi}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Save as New</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VIEW TAB CONTROLS & CHECKBOXES                       */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Quotation Analytics & Charts
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyzing {comparedQuotes.length} quotes side-by-side
            </p>
          </div>

          {/* View Tab Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start lg:self-auto">
            <button
              onClick={() => setActiveViewTab("overview")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewTab === "overview"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ChartBarIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Total Cost Chart</span>
            </button>

            <button
              onClick={() => setActiveViewTab("item_variance")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewTab === "item_variance"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingDownIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Item Price Variance</span>
            </button>

            <button
              onClick={() => setActiveViewTab("tradeoff")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewTab === "tradeoff"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClockIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Speed vs Cost</span>
            </button>

            <button
              onClick={() => setActiveViewTab("table")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewTab === "table"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DocumentTextIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Spec Table</span>
            </button>
          </div>
        </div>

        {/* Multi-Quotation Selector Pills */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Included Quotes:
            </span>
            {allQuotations.map((q) => {
              const isSelected = selectedIds.includes(q.id);
              const color = supplierColorMap.get(q.id) || SUPPLIER_COLORS[0];
              return (
                <button
                  key={q.id}
                  onClick={() => toggleQuote(q.id)}
                  title={`${q.supplierName} (${formatCurrency(q.totalAmount)})`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border max-w-xs ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/80"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${color.bg}`}
                  />
                  <span className="truncate max-w-[130px] sm:max-w-[170px]">
                    {q.supplierName}
                  </span>
                  <span
                    className={`font-mono text-[11px] shrink-0 ${
                      isSelected ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {formatCurrency(q.totalAmount)}
                  </span>
                </button>
              );
            })}

            {activeComparison && (
              <button
                onClick={handleOpenAddQuotesModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                title={`Manage quotations in "${activeComparison.name}"`}
              >
                <PlusIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add / Manage Quotes</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToAnalysis && (
              <button
                onClick={() =>
                  onNavigateToAnalysis(selectedIds, activeComparisonId)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-indigo-200" />
                <span>AI Sourcing Analysis</span>
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Add Quote</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. EXECUTIVE METRIC KPI CARDS                            */}
      {/* ======================================================== */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Lowest Bid */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Lowest Bid Offer
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                Best Price
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600">
              {formatCurrency(analysis.cheapest.totalAmount)}
            </div>
            <div
              className="text-xs font-medium text-slate-700 truncate mt-1"
              title={analysis.cheapest.supplierName}
            >
              {analysis.cheapest.supplierName}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Ref: {analysis.cheapest.quoteNumber}
            </div>
          </div>

          {/* Card 2: Potential Cost Savings */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Maximum Savings
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 font-mono">
                {analysis.maxSavingsPercent}% Saved
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-indigo-600">
              {formatCurrency(analysis.maxSavingsAmount)}
            </div>
            <div
              className="text-xs text-slate-500 mt-1 leading-tight line-clamp-1"
              title={`Savings vs highest quote (${analysis.mostExpensive.supplierName})`}
            >
              Savings vs highest quote ({analysis.mostExpensive.supplierName})
            </div>
          </div>

          {/* Card 3: Fastest Turnaround */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Fastest Delivery
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                Speed Leader
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {analysis.fastest.deliveryDays} Days
            </div>
            <div
              className="text-xs font-medium text-slate-700 truncate mt-1"
              title={analysis.fastest.supplierName}
            >
              {analysis.fastest.supplierName}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {analysis.fastest.deliveryLeadTime}
            </div>
          </div>

          {/* Card 4: Sourcing Benchmark Average */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Average Market Quote
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 bg-slate-100">
                {comparedQuotes.length} Quotes
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-800">
              {formatCurrency(analysis.averageCost)}
            </div>
            <div className="text-xs text-slate-500 mt-1 leading-tight">
              Cheapest is{" "}
              {Math.round(
                ((analysis.averageCost - analysis.cheapest.totalAmount) /
                  analysis.averageCost) *
                  100,
              )}
              % below market average
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CHART TAB 1: TOTAL QUOTE VALUE (BAR CHART)            */}
      {/* ======================================================== */}
      {activeViewTab === "overview" && analysis && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Total Quotation Price Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Normalized side-by-side total quote value ranking
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">
                    Lowest Bid (Best Value)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-slate-600 font-medium">
                    Other Quotes
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Comparative Bar Chart */}
            <div className="space-y-4">
              {comparedQuotes.map((q) => {
                const isCheapest = q.id === analysis.cheapest.id;
                const percentageOfMax = Math.round(
                  (q.totalAmount / analysis.maxTotalAmount) * 100,
                );
                const deltaVsCheapest =
                  q.totalAmount - analysis.cheapest.totalAmount;
                const percentVsCheapest =
                  analysis.cheapest.totalAmount > 0
                    ? Math.round(
                        (deltaVsCheapest / analysis.cheapest.totalAmount) * 100,
                      )
                    : 0;

                return (
                  <div key={q.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs"
                          title={q.supplierName}
                        >
                          {q.supplierName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          ({q.quoteNumber})
                        </span>
                        {isCheapest && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                            Lowest Bid
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {deltaVsCheapest > 0 && (
                          <span className="text-[11px] font-mono text-rose-600 font-medium hidden sm:inline">
                            +{formatCurrency(deltaVsCheapest)} (+
                            {percentVsCheapest}%)
                          </span>
                        )}
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {formatCurrency(q.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-8 bg-slate-100 rounded-xl overflow-hidden p-1 flex items-center relative">
                      <div
                        className={`h-full rounded-lg transition-all duration-500 flex items-center justify-between px-3 ${
                          isCheapest
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xs"
                            : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white"
                        }`}
                        style={{ width: `${Math.max(percentageOfMax, 18)}%` }}
                      >
                        <span className="text-[10px] font-semibold truncate">
                          {q.items.length} items • {q.deliveryLeadTime}
                        </span>
                        <span className="text-[11px] font-mono font-bold">
                          {percentageOfMax}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dotted Average Benchmark Line info */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Benchmark Market Average:</span>
              <span className="font-mono font-bold text-slate-700">
                {formatCurrency(analysis.averageCost)}
              </span>
            </div>
          </div>

          {/* Sourcing Recommendation Insight Box (Light Theme) */}
          <div className="relative overflow-hidden rounded-2xl bg-white text-slate-900 p-5 border border-slate-200/90 shadow-2xs">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recommended Award Decision</span>
                  </span>
                </div>
                {onNavigateToAnalysis && (
                  <button
                    onClick={() =>
                      onNavigateToAnalysis(selectedIds, activeComparisonId)
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
                  >
                    <span>Full AI Strategic Analysis</span>
                    <span>→</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed break-words">
                Choosing{" "}
                <strong className="text-slate-900 font-semibold">
                  {analysis.cheapest.supplierName}
                </strong>{" "}
                will save your organization{" "}
                <strong className="text-emerald-700 font-mono font-bold">
                  {formatCurrency(analysis.maxSavingsAmount)}
                </strong>{" "}
                ({analysis.maxSavingsPercent}% less cost).
                {analysis.cheapest.id !== analysis.fastest.id ? (
                  <span>
                    {" "}
                    However, if turnaround time is urgent,{" "}
                    <strong className="text-slate-900">
                      {analysis.fastest.supplierName}
                    </strong>{" "}
                    delivers in{" "}
                    <strong className="text-amber-700 font-mono font-bold">
                      {analysis.fastest.deliveryDays} days
                    </strong>{" "}
                    (
                    {analysis.cheapest.deliveryDays -
                      analysis.fastest.deliveryDays}{" "}
                    days faster).
                  </span>
                ) : (
                  <span>
                    {" "}
                    Remarkably,{" "}
                    <strong className="text-slate-900 font-semibold">
                      {analysis.cheapest.supplierName}
                    </strong>{" "}
                    is also your fastest delivery option (
                    {analysis.cheapest.deliveryDays} days)!
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CHART TAB 2: LINE ITEM PRICE VARIANCE CHART           */}
      {/* ======================================================== */}
      {activeViewTab === "item_variance" && analysis && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Line-Item Unit Price Variance Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare individual product pricing across suppliers to spot
              overpricing or opportunities for split sourcing
            </p>
          </div>

          {analysis.uniqueItems.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No detailed line items detected for direct item-level comparison.
            </div>
          ) : (
            <div className="space-y-6">
              {analysis.uniqueItems.map((item, itemIdx) => {
                const quoteEntries = Object.entries(item.quotes);
                const prices = quoteEntries.map(([_, v]) => v.unitPrice);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                return (
                  <div
                    key={itemIdx}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          {item.description}
                        </span>
                        {item.sku && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Part: {item.sku}
                          </span>
                        )}
                      </div>

                      {maxPrice > minPrice && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                          Spread:{" "}
                          {Math.round(((maxPrice - minPrice) / maxPrice) * 100)}
                          % variance
                        </span>
                      )}
                    </div>

                    {/* Grouped Comparative Unit Price Bars */}
                    <div className="space-y-2">
                      {comparedQuotes.map((q) => {
                        const val = item.quotes[q.id];
                        if (!val) {
                          return (
                            <div
                              key={q.id}
                              className="flex items-center gap-3 text-xs opacity-80"
                            >
                              <div
                                className="w-36 sm:w-48 truncate font-medium text-slate-500 shrink-0"
                                title={q.supplierName}
                              >
                                {q.supplierName}
                              </div>

                              <div className="flex-1 bg-amber-50/80 h-7 rounded-lg border border-dashed border-amber-200/90 px-3 flex items-center gap-1.5 text-amber-800 text-[10px] font-semibold">
                                <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Item Omitted / Not Quoted</span>
                              </div>

                              <div className="w-24 text-right font-mono font-medium text-slate-400 text-xs">
                                —
                              </div>
                            </div>
                          );
                        }

                        const isCheapestForThisItem =
                          val.unitPrice === minPrice;
                        const barWidthPercent =
                          maxPrice > 0
                            ? Math.round((val.unitPrice / maxPrice) * 100)
                            : 50;

                        return (
                          <div
                            key={q.id}
                            className="flex items-center gap-3 text-xs"
                          >
                            <div
                              className="w-36 sm:w-48 truncate font-medium text-slate-700 shrink-0"
                              title={val.supplierName}
                            >
                              {val.supplierName}
                            </div>

                            <div className="flex-1 bg-white h-7 rounded-lg border border-slate-200/80 p-0.5 overflow-hidden flex items-center">
                              <div
                                className={`h-full rounded-md transition-all duration-300 flex items-center px-2 text-[10px] font-semibold ${
                                  isCheapestForThisItem
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-300 text-slate-700"
                                }`}
                                style={{
                                  width: `${Math.max(barWidthPercent, 20)}%`,
                                }}
                              >
                                {isCheapestForThisItem ? "Best Price" : ""}
                              </div>
                            </div>

                            <div className="w-24 text-right font-mono font-bold text-slate-900 text-xs">
                              {formatCurrency(val.unitPrice, 2)} /{" "}
                              {item.unit || "unit"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CHART TAB 3: SPEED VS COST (TRADE-OFF MATRIX)         */}
      {/* ======================================================== */}
      {activeViewTab === "tradeoff" && analysis && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cost vs Delivery Speed Trade-Off Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize the trade-off between lead time turnaround and total
              quote cost
            </p>
          </div>

          <div className="relative border border-slate-200 rounded-2xl p-6 bg-slate-50/50 min-h-[300px] flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="p-3 rounded-xl border border-dashed border-emerald-300/80 bg-emerald-50/40 text-xs">
                <span className="font-bold text-emerald-800 block text-[11px] uppercase tracking-wider">
                  ★ Ideal Sweet Spot
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  Fast Turnaround + Lower Cost
                </span>
              </div>

              <div className="p-3 rounded-xl border border-dashed border-sky-300/80 bg-sky-50/40 text-xs">
                <span className="font-bold text-sky-800 block text-[11px] uppercase tracking-wider">
                  ⚡ Expedited Option
                </span>
                <span className="text-[10px] text-sky-600 block mt-0.5">
                  Fast Delivery at Higher Cost
                </span>
              </div>

              <div className="p-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 text-xs">
                <span className="font-bold text-amber-800 block text-[11px] uppercase tracking-wider">
                  ⏳ Economy Option
                </span>
                <span className="text-[10px] text-amber-600 block mt-0.5">
                  Low Cost with Longer Lead Time
                </span>
              </div>

              <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-100/40 text-xs">
                <span className="font-bold text-slate-500 block text-[11px] uppercase tracking-wider">
                  Standard Sourcing
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Higher Cost & Standard Speed
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {comparedQuotes.map((q) => {
                const isCheapest = q.id === analysis.cheapest.id;
                const isFastest = q.id === analysis.fastest.id;

                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span
                        className="font-bold text-xs text-slate-900 truncate min-w-0 flex-1"
                        title={q.supplierName}
                      >
                        {q.supplierName}
                      </span>
                      {isCheapest && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                          Lowest Price
                        </span>
                      )}
                      {!isCheapest && isFastest && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                          Fastest
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          Lead Time
                        </span>
                        <span className="font-mono font-semibold text-slate-700">
                          {q.deliveryDays} Days
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">
                          Total Quoted
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(q.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. CHART TAB 4: DETAILED SPECIFICATION MATRIX            */}
      {/* ======================================================== */}
      {activeViewTab === "table" && analysis && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 text-[11px] font-semibold">
                  <th className="py-3 px-4 w-60">Metric</th>
                  {comparedQuotes.map((q) => {
                    const isCheapest = q.id === analysis.cheapest.id;
                    return (
                      <th
                        key={q.id}
                        className="py-3 px-4 min-w-[180px] max-w-[240px]"
                      >
                        <span
                          className="font-bold text-slate-900 text-xs block truncate"
                          title={q.supplierName}
                        >
                          {q.supplierName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 block font-normal">
                          {q.quoteNumber}
                        </span>
                        {isCheapest && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 mt-1">
                            Best Price
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/40 font-semibold">
                  <td className="py-3 px-4 text-slate-800">Total Quotation</td>
                  {comparedQuotes.map((q) => {
                    const isCheapest = q.id === analysis.cheapest.id;
                    return (
                      <td key={q.id} className="py-3 px-4 font-mono font-bold">
                        <span
                          className={
                            isCheapest
                              ? "text-emerald-600 text-sm"
                              : "text-slate-900"
                          }
                        >
                          {formatCurrency(q.totalAmount)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Lead Time</td>
                  {comparedQuotes.map((q) => (
                    <td
                      key={q.id}
                      className="py-2.5 px-4 font-medium text-slate-800"
                    >
                      {q.deliveryLeadTime} ({q.deliveryDays} days)
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Valid Until</td>
                  {comparedQuotes.map((q) => (
                    <td
                      key={q.id}
                      className="py-2.5 px-4 font-mono text-slate-700"
                    >
                      {q.validUntil}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Payment Terms</td>
                  {comparedQuotes.map((q) => (
                    <td key={q.id} className="py-2.5 px-4 text-slate-700">
                      {q.paymentTerms}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-2.5 px-4 text-slate-600">
                    Line Item Scope Coverage
                  </td>
                  {comparedQuotes.map((q) => {
                    const missing = analysis.quoteMissingMap.get(q.id) || [];
                    const isComplete = missing.length === 0;
                    return (
                      <td key={q.id} className="py-2.5 px-4">
                        <div className="font-semibold text-xs text-slate-900">
                          {q.items.length} of {analysis.totalScopeItems} items
                        </div>
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">
                            ✓ Complete Scope
                          </span>
                        ) : (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              ⚠️ {missing.length} Missing
                            </span>
                            <div
                              className="text-[10px] text-rose-600 font-medium mt-0.5 truncate max-w-[180px]"
                              title={`Missing items: ${missing.join(", ")}`}
                            >
                              Omitted: {missing.join(", ")}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE NEW COMPARISON                           */}
      {/* ======================================================== */}
      {mounted && showNewModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Save New Comparison
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
              Create a named comparison project and select which supplier
              quotations to benchmark together.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Comparison Name
                </label>
                <input
                  type="text"
                  value={newComparisonName}
                  onChange={(e) => setNewComparisonName(e.target.value)}
                  placeholder="e.g. Structural Steel Sourcing Q4"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newComparisonDescription}
                  onChange={(e) => setNewComparisonDescription(e.target.value)}
                  placeholder="e.g. Evaluating turnaround vs pricing for Phase 2"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Quotes to Compare ({newModalSelectedQuoteIds.length}{" "}
                  selected)
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {allQuotations.map((q) => {
                    const isChecked = newModalSelectedQuoteIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors gap-3 ${
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
                              setNewModalSelectedQuoteIds((prev) =>
                                prev.includes(q.id)
                                  ? prev.filter((id) => id !== q.id)
                                  : [...prev, q.id],
                              );
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
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateComparison}
                disabled={
                  isProcessingApi || newModalSelectedQuoteIds.length < 2
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs"
              >
                {isProcessingApi ? "Saving..." : "Save Comparison"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 2: MANAGE / SWITCH ALL SAVED COMPARISONS          */}
      {/* ======================================================== */}
      {mounted && showManageModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Saved Quotation Comparisons ({comparisons.length})
                </h3>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              All quotation comparisons are saved in the database. Select one to
              immediately load its analytics or manage existing comparisons.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {/* Option to select All Quotations */}
              <div
                onClick={() => {
                  handleSelectComparison(null);
                  setShowManageModal(false);
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                  activeComparisonId === null
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🌐</span>
                  <div>
                    <span className="font-bold block">
                      All Quotations Benchmark
                    </span>
                    <span
                      className={`text-[11px] ${activeComparisonId === null ? "text-slate-300" : "text-slate-500"}`}
                    >
                      Compare all {allQuotations.length} uploaded quotations
                    </span>
                  </div>
                </div>
                {activeComparisonId === null && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500 text-white">
                    Active
                  </span>
                )}
              </div>

              {/* Saved comparison items */}
              {comparisons.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No custom comparisons saved yet.
                </div>
              ) : (
                comparisons.map((comp) => {
                  const isActive = activeComparisonId === comp.id;
                  return (
                    <div
                      key={comp.id}
                      className={`p-3 rounded-xl border text-xs transition-colors flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-indigo-50/60 border-indigo-400 shadow-2xs"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div
                        onClick={() => {
                          handleSelectComparison(comp);
                          setShowManageModal(false);
                        }}
                        className="flex-1 cursor-pointer min-w-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span
                            className="font-bold text-slate-900 truncate"
                            title={comp.name}
                          >
                            {comp.name}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        <div
                          className="text-[11px] text-slate-500 mt-1 truncate"
                          title={getComparisonSupplierNames(comp.quoteIds)}
                        >
                          {comp.quoteIds?.length || 0} quotes:{" "}
                          <span className="font-medium text-slate-700">
                            {getComparisonSupplierNames(comp.quoteIds)}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Saved on {formatDate(comp.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOpenRename(comp)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Rename"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(comp.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowManageModal(false);
                  handleOpenCreateModal();
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Create New Comparison</span>
              </button>

              <button
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RENAME COMPARISON                               */}
      {/* ======================================================== */}
      {mounted && showRenameModal && renameTarget && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Rename Comparison
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Comparison Name
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={isProcessingApi || !renameValue.trim()}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl"
              >
                {isProcessingApi ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {mounted && deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Delete Saved Comparison?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This comparison record will be permanently deleted from the
              database. The actual supplier quotations will remain unaffected.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                disabled={isProcessingApi}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl"
              >
                {isProcessingApi ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 5: ADD / MANAGE QUOTES IN COMPARISON               */}
      {/* ======================================================== */}
      {mounted && showAddQuotesModal && activeComparison && createPortal(
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
                  <p className="text-xs text-slate-500 font-medium truncate max-w-xs" title={activeComparison.name}>
                    Project: <span className="text-indigo-600 font-semibold">{activeComparison.name}</span>
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
              Select which supplier quotations should be included in this comparison:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {allQuotations.map((q) => {
                const isChecked = modalAddQuoteIds.includes(q.id);
                const wasOriginallyIncluded = (activeComparison.quoteIds || []).includes(q.id);

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
                  onClick={handleConfirmModalAddQuotes}
                  disabled={isProcessingApi || modalAddQuoteIds.length < 2}
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
    </div>
  );
}
