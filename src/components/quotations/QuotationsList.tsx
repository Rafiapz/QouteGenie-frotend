"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DocumentTextIcon,
  SearchIcon,
  XIcon,
  ScaleIcon,
  UploadCloudIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  CalendarIcon,
  MailIcon,
  PhoneIcon,
  CheckIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  TruckIcon,
  FilterIcon,
  ViewGridIcon,
  ViewListIcon,
  ShieldCheckIcon,
  BuildingIcon,
  AlertTriangleIcon,
} from "@/components/Icons";
import { Quotation } from "@/types/quotation";
import { deleteQuotation } from "@/services/quotationStorage";
import {
  deleteQuoteFromApi,
  getQuotesFromApi,
  getSuppliers,
  GetQuotesFilterOptions,
} from "@/services/api";
import { formatCurrency } from "@/utils/format";
import PlanLimitModal from "@/components/common/PlanLimitModal";

interface QuotationsListProps {
  quotations: Quotation[];
  onQuotationsChange: (updated: Quotation[]) => void;
  onOpenUpload: () => void;
  onCompareQuotes: (quoteIds: string[]) => void;
}

export function QuotationsList({
  quotations,
  onQuotationsChange,
  onOpenUpload,
  onCompareQuotes,
}: QuotationsListProps) {
  // Backend query filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "date" | "amount_asc" | "amount_desc" | "delivery" | "items"
  >("date");

  // Backend quotations result state (all filtering and sorting performed by PostgreSQL backend)
  const [backendQuotes, setBackendQuotes] = useState<Quotation[]>(quotations);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Available suppliers for filter dropdown
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);

  // View mode & selection state
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [activePreviewQuote, setActivePreviewQuote] = useState<Quotation | null>(null);

  // Single deletion state
  const [quotePendingDelete, setQuotePendingDelete] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Batch deletion state
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to map backend API quote entity to frontend Quotation structure
  const mapApiQuoteToQuotation = useCallback((q: any): Quotation => {
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      supplierId: q.supplierId,
      supplierName: q.supplier?.name || "Supplier",
      supplierEmail: q.supplier?.email || null,
      supplierPhone: q.supplier?.phone || null,
      items: (q.quoteLines || []).map((l: any) => ({
        id: l.id,
        description: l.description || l.partNumber,
        sku: l.partNumber,
        quantity: l.quantity,
        unit: l.unit || "units",
        unitPrice: Number(l.price),
        totalPrice: Number(l.totalPrice || l.quantity * l.price),
      })),
      subtotal: Number(q.totalAmount || 0) - Number(q.taxAmount || 0),
      tax: Number(q.taxAmount || 0),
      totalAmount: Number(q.totalAmount || 0),
      deliveryLeadTime: q.deliveryLeadTime || "5 business days",
      deliveryDays: parseInt(q.deliveryLeadTime, 10) || 5,
      validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split("T")[0] : "",
      paymentTerms: q.paymentTerms || "Net 30",
      notes: q.notes || "",
      status: "verified",
      confidenceScore: 98,
      createdAt: q.createdAt,
    };
  }, []);

  // 1. Fetch available suppliers for the filter dropdown
  useEffect(() => {
    getSuppliers()
      .then((sups) => {
        if (Array.isArray(sups)) {
          const names = Array.from(
            new Set([
              ...sups.map((s) => s.name),
              ...quotations.map((q) => q.supplierName),
            ])
          )
            .filter(Boolean)
            .sort();
          setAvailableSuppliers(names);
        }
      })
      .catch(() => {
        const names = Array.from(new Set(quotations.map((q) => q.supplierName)))
          .filter(Boolean)
          .sort();
        setAvailableSuppliers(names);
      });
  }, [quotations]);

  // 2. Debounce search query changes (400ms) before sending request to backend API
  const isDebouncing = searchQuery !== debouncedSearchQuery;
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // If search is cleared immediately, skip delay
    if (searchQuery === "") {
      setDebouncedSearchQuery("");
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 3. Perform filtering & sorting strictly on the BACKEND via GET /api/v1/quotes
  const fetchFilteredFromBackend = useCallback(async () => {
    // Abort any prior in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsFilterLoading(true);
    setBackendError(null);

    const filterOptions: GetQuotesFilterOptions = {
      search: debouncedSearchQuery.trim() || undefined,
      supplier: selectedSupplierFilter !== "all" ? selectedSupplierFilter : undefined,
      sortBy,
      signal: abortController.signal,
    };

    try {
      const rawRecords = await getQuotesFromApi(filterOptions);
      if (Array.isArray(rawRecords)) {
        const mapped = rawRecords.map(mapApiQuoteToQuotation);
        setBackendQuotes(mapped);
      }
    } catch (err: any) {
      if (
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.code === "ERR_CANCELED"
      ) {
        // Request cancelled by newer debounced keystroke, safely ignore
        return;
      }
      console.error("Backend filtering failed:", err);
      setBackendError(err.message || "Failed to retrieve filtered quotations from backend.");
    } finally {
      setIsFilterLoading(false);
    }
  }, [debouncedSearchQuery, selectedSupplierFilter, sortBy, mapApiQuoteToQuotation]);

  // Trigger backend query whenever filter parameters change
  useEffect(() => {
    fetchFilteredFromBackend();
  }, [fetchFilteredFromBackend]);

  // Sync initial quotations when prop changes and no active search filter is applied
  useEffect(() => {
    if (!debouncedSearchQuery && selectedSupplierFilter === "all" && sortBy === "date") {
      setBackendQuotes(quotations);
    }
  }, [quotations, debouncedSearchQuery, selectedSupplierFilter, sortBy]);

  // Summary Metrics KPIs based on current quotations
  const metrics = useMemo(() => {
    const sourceList = quotations.length > 0 ? quotations : backendQuotes;
    if (sourceList.length === 0) {
      return {
        totalQuotes: 0,
        totalPipelineValue: 0,
        avgAmount: 0,
        uniqueSuppliersCount: 0,
        minDeliveryDays: 0,
        maxDeliveryDays: 0,
      };
    }
    const totalPipelineValue = sourceList.reduce(
      (acc, q) => acc + (q.totalAmount || 0),
      0
    );
    const avgAmount = totalPipelineValue / sourceList.length;
    const suppliers = new Set(sourceList.map((q) => q.supplierName));
    const validDays = sourceList
      .map((q) => q.deliveryDays || 0)
      .filter((d) => d > 0);
    const minDeliveryDays = validDays.length > 0 ? Math.min(...validDays) : 0;
    const maxDeliveryDays = validDays.length > 0 ? Math.max(...validDays) : 0;

    return {
      totalQuotes: sourceList.length,
      totalPipelineValue,
      avgAmount,
      uniqueSuppliersCount: suppliers.size,
      minDeliveryDays,
      maxDeliveryDays,
    };
  }, [quotations, backendQuotes]);

  // Total amount of selected quotes
  const selectedTotalAmount = useMemo(() => {
    return backendQuotes
      .filter((q) => selectedQuoteIds.includes(q.id))
      .reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  }, [backendQuotes, selectedQuoteIds]);

  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [planLimitModal, setPlanLimitModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    limitType: "comparisons" | "quotes_per_comparison" | "uploads" | "generic";
  }>({
    isOpen: false,
    message: "",
    limitType: "quotes_per_comparison",
  });

  const handleUploadClick = () => {
    if (quotations.length >= 4) {
      setPlanLimitModal({
        isOpen: true,
        title: "Quotation Upload Limit",
        message:
          "Free Plan limit reached: You can upload and store a maximum of 4 quotations on the Free plan. Please delete an existing quotation or upgrade your plan to upload more.",
        limitType: "uploads",
      });
      return;
    }
    onOpenUpload();
  };

  // Toggle quotation selection (Free plan max 3 quotes per comparison)
  const toggleSelectQuote = (id: string) => {
    setSelectedQuoteIds((prev) => {
      if (prev.includes(id)) {
        setLimitNotice(null);
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        setPlanLimitModal({
          isOpen: true,
          title: "Quotation Selection Limit",
          message: "You can only compare up to 3 quotations at a time on the Free plan. Please deselect a quotation before selecting another one.",
          limitType: "quotes_per_comparison",
        });
        return prev;
      }
      setLimitNotice(null);
      return [...prev, id];
    });
  };

  // Select all or deselect all (Free plan selects up to first 3)
  const toggleSelectAll = () => {
    if (selectedQuoteIds.length > 0) {
      setSelectedQuoteIds([]);
      setLimitNotice(null);
    } else {
      const first3 = backendQuotes.slice(0, 3).map((q) => q.id);
      setSelectedQuoteIds(first3);
      if (backendQuotes.length > 3) {
        setLimitNotice("Free plan limit: Selected 3 quotations (maximum allowed per comparison).");
      }
    }
  };

  // Helper for supplier initials and color badge
  const getSupplierStyle = (name: string) => {
    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("") || "SP";

    const colorVariants = [
      { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
      { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
      { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
      { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const variant = colorVariants[Math.abs(hash) % colorVariants.length];

    return { initials, ...variant };
  };

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

  // Delete modal triggers
  const handleOpenDeleteModal = (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    setDeleteError(null);
    setQuotePendingDelete(quote);
  };

  const handleConfirmDelete = async () => {
    if (!quotePendingDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteQuoteFromApi(quotePendingDelete.id);
      deleteQuotation(quotePendingDelete.id);

      const updated = quotations.filter((q) => q.id !== quotePendingDelete.id);
      onQuotationsChange(updated);
      setSelectedQuoteIds((prev) => prev.filter((item) => item !== quotePendingDelete.id));

      if (activePreviewQuote?.id === quotePendingDelete.id) {
        setActivePreviewQuote(null);
      }

      setQuotePendingDelete(null);
      // Re-fetch backend list
      fetchFilteredFromBackend();
    } catch (err: any) {
      console.error("Failed to delete quotation:", err);
      try {
        deleteQuotation(quotePendingDelete.id);
        const updated = quotations.filter((q) => q.id !== quotePendingDelete.id);
        onQuotationsChange(updated);
        setSelectedQuoteIds((prev) => prev.filter((item) => item !== quotePendingDelete.id));
        if (activePreviewQuote?.id === quotePendingDelete.id) {
          setActivePreviewQuote(null);
        }
        setQuotePendingDelete(null);
        fetchFilteredFromBackend();
      } catch {
        setDeleteError(err.message || "Failed to delete quotation from server.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch delete handler
  const handleConfirmBatchDelete = async () => {
    if (selectedQuoteIds.length === 0) return;

    setIsBatchDeleting(true);
    setBatchDeleteError(null);

    try {
      for (const id of selectedQuoteIds) {
        try {
          await deleteQuoteFromApi(id);
        } catch {
          // ignore individual remote failures during batch
        }
        deleteQuotation(id);
      }

      const updated = quotations.filter((q) => !selectedQuoteIds.includes(q.id));
      onQuotationsChange(updated);
      setSelectedQuoteIds([]);
      setShowBatchDeleteModal(false);
      fetchFilteredFromBackend();
    } catch (err: any) {
      setBatchDeleteError(err.message || "Failed to delete selected quotations.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const isAllSelected =
    backendQuotes.length > 0 &&
    selectedQuoteIds.length === backendQuotes.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ======================================================== */}
      {/* 1. HEADER & SUMMARY METRICS BANNER                      */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <DocumentTextIcon className="w-3.5 h-3.5" />
              <span>Quotation Repository</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quotations & Line Items
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            Manage your extracted supplier quotations, inspect itemized pricing, and select quotations for AI Quote Analysis.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleUploadClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UploadCloudIcon className="w-4 h-4" />
            <span>Upload Quotation PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {metrics.totalQuotes > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Total Quotations */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Quotes
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                  {metrics.totalQuotes}
                </span>
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  in vault
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Pipeline Spend */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Scope Value
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono truncate">
                  {formatCurrency(metrics.totalPipelineValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Suppliers */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Suppliers
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                  {metrics.uniqueSuppliersCount}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  unique vendors
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TOOLBAR & CONTROLS (BACKEND-DRIVEN FILTERING)         */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Search input with debounced backend query */}
        <div className="relative flex-1 max-w-md">
          {isDebouncing || isFilterLoading ? (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              <span className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin block" />
            </div>
          ) : (
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes by vendor, quote #, or item description..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDebouncedSearchQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right side controls: Backend Filter, Sort, View Mode, Select All */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
          {/* Backend Supplier Filter */}
          {availableSuppliers.length > 0 && (
            <div className="relative">
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer appearance-none"
              >
                <option value="all">All Suppliers ({availableSuppliers.length})</option>
                {availableSuppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FilterIcon className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Backend Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="date">Date: Latest First</option>
            <option value="amount_asc">Price: Low to High</option>
            <option value="amount_desc">Price: High to Low</option>
            <option value="delivery">Fastest Delivery</option>
            <option value="items">Most Line Items</option>
          </select>

          {/* View Mode Toggle (Grid vs Table) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-indigo-600 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <ViewGridIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <ViewListIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Select All Toggle Button */}
          {backendQuotes.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                isAllSelected
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>
      </div>

      {/* Match indicator / result count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 min-h-[20px]">
        <div className="flex items-center gap-2">
          {isFilterLoading ? (
            <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs animate-pulse">
              <span className="w-3 h-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
              <span>Loading quotations...</span>
            </span>
          ) : (
            <span>
              Showing <strong className="text-slate-800">{backendQuotes.length}</strong> quotation{backendQuotes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {(searchQuery || selectedSupplierFilter !== "all" || sortBy !== "date") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedSupplierFilter("all");
              setSortBy("date");
            }}
            className="text-indigo-600 hover:underline font-semibold cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Backend Error Banner if API fails */}
      {backendError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{backendError}</span>
          <button
            onClick={fetchFilteredFromBackend}
            className="font-bold underline hover:text-rose-950"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. QUOTATIONS CONTENT (DIRECTLY RENDERED FROM BACKEND)   */}
      {/* ======================================================== */}
      {backendQuotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Quotations Found</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {searchQuery || selectedSupplierFilter !== "all"
                ? "No supplier quotations in the database matched your query filters."
                : "Upload your first supplier quotation PDF to extract line items and unlock automated comparisons."}
            </p>
          </div>
          <div className="pt-2">
            {searchQuery || selectedSupplierFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSupplierFilter("all");
                  setSortBy("date");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={handleUploadClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloudIcon className="w-4 h-4" />
                <span>Upload Quotation PDF</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ======================================================== */
        /* 3A. MODERN CARD GRID VIEW                                */
        /* ======================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {backendQuotes.map((quote) => {
            const isSelected = selectedQuoteIds.includes(quote.id);
            const style = getSupplierStyle(quote.supplierName);

            return (
              <div
                key={quote.id}
                onClick={() => toggleSelectQuote(quote.id)}
                className={`group bg-white rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 shadow-sm bg-indigo-50/10"
                    : "border-slate-200/80 hover:border-indigo-300 hover:shadow-md shadow-2xs"
                }`}
              >
                <div>
                  {/* Top Header: Checkbox + Supplier Avatar + Details */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 pointer-events-none shrink-0"
                      />

                      {/* Supplier Avatar Pill */}
                      <div
                        className={`w-9 h-9 rounded-xl ${style.bg} ${style.text} ${style.border} border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                      >
                        {style.initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors"
                            title={quote.supplierName}
                          >
                            {quote.supplierName}
                          </h3>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 block truncate">
                          #{quote.quoteNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Items Highlight Banner */}
                  <div className="bg-slate-50/80 rounded-2xl p-3.5 my-3.5 border border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Total Amount
                      </span>
                      <span className="font-mono text-lg sm:text-xl font-bold text-slate-900">
                        {formatCurrency(quote.totalAmount)}
                      </span>
                    </div>
                    <span className="px-2 py-0.8 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 font-mono">
                      {quote.items.length} item{quote.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Specifications & Terms Grid */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Lead Time:</span>
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {quote.deliveryLeadTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Valid Until:</span>
                      </span>
                      <span className="font-mono text-slate-700 text-[11px]">
                        {quote.validUntil}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Terms:</span>
                      </span>
                      <span className="text-slate-700 text-[11px] truncate max-w-[140px]">
                        {quote.paymentTerms}
                      </span>
                    </div>
                  </div>

                  {/* Top Line Items Sneak Peek */}
                  {quote.items && quote.items.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {quote.items.slice(0, 2).map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[10px] text-slate-600 truncate max-w-[170px]"
                          title={`${item.quantity}x ${item.description}`}
                        >
                          <strong className="font-mono text-slate-900">{item.quantity}x</strong>{" "}
                          {item.description}
                        </span>
                      ))}
                      {quote.items.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-500">
                          +{quote.items.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePreviewQuote(quote);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompareQuotes([quote.id]);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Launch comparison with this quotation"
                    >
                      <ScaleIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Compare</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleOpenDeleteModal(e, quote)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete quote"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* 3B. ENTERPRISE TABLE / DATA LIST VIEW                     */
        /* ======================================================== */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Supplier & Quote #</th>
                  <th className="py-3 px-4">Scope & Items</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backendQuotes.map((quote) => {
                  const isSelected = selectedQuoteIds.includes(quote.id);
                  const style = getSupplierStyle(quote.supplierName);

                  return (
                    <tr
                      key={quote.id}
                      onClick={() => toggleSelectQuote(quote.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50/40 hover:bg-indigo-50/60"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectQuote(quote.id)}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Supplier & Quote # */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl ${style.bg} ${style.text} ${style.border} border flex items-center justify-center font-bold text-xs shrink-0`}
                          >
                            {style.initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate hover:text-indigo-600">
                              {quote.supplierName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block truncate">
                              #{quote.quoteNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                            {quote.items.length} items
                          </span>
                          {quote.items[0] && (
                            <span className="text-[11px] text-slate-500 truncate max-w-[160px] hidden sm:inline">
                              {quote.items[0].description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lead Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{quote.deliveryLeadTime}</span>
                        </span>
                      </td>

                      {/* Valid Until */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-700 text-[11px]">
                          {quote.validUntil}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {formatCurrency(quote.totalAmount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActivePreviewQuote(quote)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="View quote details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onCompareQuotes([quote.id])}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Compare quotation"
                          >
                            <ScaleIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenDeleteModal(e, quote)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete quotation"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. FLOATING BATCH SELECTION & ACTION BAR                 */}
      {/* ======================================================== */}
      {selectedQuoteIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[92%] sm:w-auto bg-slate-900/95 text-white px-4 sm:px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700/60 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {selectedQuoteIds.length}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-semibold">
                {selectedQuoteIds.length} quotation{selectedQuoteIds.length !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <span className="text-[11px] text-slate-400">
                • Total: <strong className="text-emerald-400 font-mono">{formatCurrency(selectedTotalAmount)}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {limitNotice && (
              <span className="text-[11px] text-amber-300 font-semibold bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-700/50 mr-1 animate-in fade-in duration-150">
                {limitNotice}
              </span>
            )}

            <button
              onClick={() => {
                setSelectedQuoteIds([]);
                setLimitNotice(null);
              }}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Clear
            </button>

            <button
              onClick={() => setShowBatchDeleteModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-xl border border-rose-800/60 transition-colors cursor-pointer flex items-center gap-1"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <button
              onClick={() => {
                if (selectedQuoteIds.length > 3) {
                  setPlanLimitModal({
                    isOpen: true,
                    title: "Quotation Limit Exceeded",
                    message: "You can only compare up to 3 quotations at a time on the Free plan. Please select 2 or 3 quotations.",
                    limitType: "quotes_per_comparison",
                  });
                  return;
                }
                onCompareQuotes(selectedQuoteIds);
              }}
              disabled={selectedQuoteIds.length < 2 || selectedQuoteIds.length > 3}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
              title={
                selectedQuoteIds.length < 2
                  ? "Select at least 2 quotations to run AI comparison"
                  : selectedQuoteIds.length > 3
                  ? "Free plan limit: Maximum 3 quotations can be compared"
                  : "Launch AI quote comparison"
              }
            >
              <ScaleIcon className="w-3.5 h-3.5" />
              <span>Compare Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. QUOTATION DETAIL PREVIEW MODAL                        */}
      {/* ======================================================== */}
      {mounted && activePreviewQuote && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center min-h-screen animate-in fade-in duration-100"
          onClick={() => setActivePreviewQuote(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative max-h-[88vh] flex flex-col my-auto text-left animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm shrink-0">
                  {getSupplierStyle(activePreviewQuote.supplierName).initials}
                </div>
                <div>
                  <h3
                    className="text-base sm:text-lg font-bold text-slate-900 break-words"
                    title={activePreviewQuote.supplierName}
                  >
                    {activePreviewQuote.supplierName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-mono font-medium">
                      #{activePreviewQuote.quoteNumber}
                    </span>
                    <span>•</span>
                    <span>Uploaded: {formatDate(activePreviewQuote.createdAt)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActivePreviewQuote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl shrink-0 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-1 py-1">
              {/* Terms Overview Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Lead Time
                  </span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm mt-0.5 block">
                    {activePreviewQuote.deliveryLeadTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valid Until
                  </span>
                  <span className="font-mono text-slate-800 text-xs sm:text-sm mt-0.5 block">
                    {activePreviewQuote.validUntil}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment Terms
                  </span>
                  <span className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 block truncate">
                    {activePreviewQuote.paymentTerms}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/60 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3.5">Item Description</th>
                        <th className="py-2.5 px-2 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3.5 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePreviewQuote.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3.5 font-medium text-slate-900">
                            <div>{item.description}</div>
                            {item.sku && (
                              <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                                SKU: {item.sku}
                              </span>
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

            {/* Total Footer Banner & Actions (Pinned at bottom) */}
            <div className="shrink-0 space-y-3 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-600 block">Total Quotation Value</span>
                  <span className="text-[11px] text-slate-400">
                    {activePreviewQuote.items.length} line items extracted
                  </span>
                </div>
                <span className="font-mono font-bold text-lg sm:text-xl text-slate-900">
                  {formatCurrency(activePreviewQuote.totalAmount)}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => handleOpenDeleteModal(e, activePreviewQuote)}
                  className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete Quote</span>
                </button>

                <button
                  onClick={() => {
                    onCompareQuotes([activePreviewQuote.id]);
                    setActivePreviewQuote(null);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ScaleIcon className="w-3.5 h-3.5" />
                  <span>Compare with AI Analysis</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 6. SINGLE DELETE CONFIRMATION MODAL                      */}
      {/* ======================================================== */}
      {mounted && quotePendingDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Quotation
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed break-words">
                  Are you sure you want to delete quotation{" "}
                  <strong className="text-slate-900 font-mono">
                    #{quotePendingDelete.quoteNumber}
                  </strong>{" "}
                  from{" "}
                  <strong className="text-slate-900 break-words">
                    {quotePendingDelete.supplierName}
                  </strong>
                  ?
                </p>

                <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Quotation Total:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(quotePendingDelete.totalAmount)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  This will permanently delete this quotation and its {quotePendingDelete.items.length} line items.
                </p>

                {deleteError && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setQuotePendingDelete(null);
                  setDeleteError(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Delete Quotation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 7. BATCH DELETE CONFIRMATION MODAL                       */}
      {/* ======================================================== */}
      {mounted && showBatchDeleteModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">
                  Delete {selectedQuoteIds.length} Quotations
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to delete all{" "}
                  <strong className="text-slate-900">{selectedQuoteIds.length}</strong> selected quotations?
                </p>

                <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Combined Value:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(selectedTotalAmount)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  This action cannot be undone. All extracted line items and quotation records will be removed.
                </p>

                {batchDeleteError && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {batchDeleteError}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={() => {
                  setShowBatchDeleteModal(false);
                  setBatchDeleteError(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isBatchDeleting}
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isBatchDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting {selectedQuoteIds.length}...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Delete All Selected</span>
                  </>
                )}
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
