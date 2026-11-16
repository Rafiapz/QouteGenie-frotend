"use client";

import React, { useState, useMemo } from "react";
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
} from "@/components/Icons";
import { Quotation } from "@/types/quotation";
import { deleteQuotation } from "@/services/quotationStorage";
import { deleteQuoteFromApi } from "@/services/api";
import { formatCurrency } from "@/utils/format";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount_asc" | "amount_desc" | "delivery">("date");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [activePreviewQuote, setActivePreviewQuote] = useState<Quotation | null>(null);

  // Deletion confirmation state
  const [quotePendingDelete, setQuotePendingDelete] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    quotations.forEach((q) => map.set(q.supplierName, q.supplierName));
    return Array.from(map.values());
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    const result = quotations.filter((q) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        q.quoteNumber.toLowerCase().includes(query) ||
        q.supplierName.toLowerCase().includes(query) ||
        q.items.some((i) => i.description.toLowerCase().includes(query));

      const matchesSupplier =
        selectedSupplierFilter === "all" || q.supplierName === selectedSupplierFilter;

      return matchesSearch && matchesSupplier;
    });

    result.sort((a, b) => {
      if (sortBy === "amount_asc") return a.totalAmount - b.totalAmount;
      if (sortBy === "amount_desc") return b.totalAmount - a.totalAmount;
      if (sortBy === "delivery") return a.deliveryDays - b.deliveryDays;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [quotations, searchQuery, selectedSupplierFilter, sortBy]);

  const toggleSelectQuote = (id: string) => {
    setSelectedQuoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
      // 1. Delete from PostgreSQL database via API
      await deleteQuoteFromApi(quotePendingDelete.id);

      // 2. Clear from local storage cache if saved there
      deleteQuotation(quotePendingDelete.id);

      // 3. Update active parent state
      const updated = quotations.filter((q) => q.id !== quotePendingDelete.id);
      onQuotationsChange(updated);
      setSelectedQuoteIds((prev) => prev.filter((item) => item !== quotePendingDelete.id));

      if (activePreviewQuote?.id === quotePendingDelete.id) {
        setActivePreviewQuote(null);
      }

      setQuotePendingDelete(null);
    } catch (err: any) {
      console.error("Failed to delete quotation:", err);
      // Fallback: If quotation only existed in localStorage cache, delete cleanly
      try {
        deleteQuotation(quotePendingDelete.id);
        const updated = quotations.filter((q) => q.id !== quotePendingDelete.id);
        onQuotationsChange(updated);
        setSelectedQuoteIds((prev) => prev.filter((item) => item !== quotePendingDelete.id));
        if (activePreviewQuote?.id === quotePendingDelete.id) {
          setActivePreviewQuote(null);
        }
        setQuotePendingDelete(null);
      } catch {
        setDeleteError(err.message || "Failed to delete quotation from server.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selection Action Bar (Floating pill when items selected) */}
      {selectedQuoteIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center">
              {selectedQuoteIds.length}
            </span>
            <span>
              {selectedQuoteIds.length} quotation{selectedQuoteIds.length > 1 ? "s" : ""} selected for comparison
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedQuoteIds([])}
              className="text-slate-400 hover:text-white px-2 py-1 rounded"
            >
              Clear
            </button>
            <button
              onClick={() => onCompareQuotes(selectedQuoteIds)}
              disabled={selectedQuoteIds.length < 2}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ScaleIcon className="w-3.5 h-3.5" />
              <span>Compare Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Clean Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotations..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end flex-wrap">
          {uniqueSuppliers.length > 0 && (
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Suppliers</option>
              {uniqueSuppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="date">Latest First</option>
            <option value="amount_asc">Price: Low to High</option>
            <option value="amount_desc">Price: High to Low</option>
            <option value="delivery">Fastest Delivery</option>
          </select>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloudIcon className="w-3.5 h-3.5" />
            <span>Upload Quote</span>
          </button>
        </div>
      </div>

      {/* Quotations Grid */}
      {filteredQuotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Quotations Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {searchQuery
              ? `No quote matches "${searchQuery}".`
              : "Upload a quotation PDF to extract and store line items."}
          </p>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl"
          >
            <UploadCloudIcon className="w-3.5 h-3.5" />
            <span>Upload Quotation PDF</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotations.map((quote) => {
            const isSelected = selectedQuoteIds.includes(quote.id);
            return (
              <div
                key={quote.id}
                onClick={() => toggleSelectQuote(quote.id)}
                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-indigo-600 ring-2 ring-indigo-500/10 shadow-xs bg-indigo-50/10"
                    : "border-slate-200/80 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 pointer-events-none"
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-slate-400 block truncate">
                          {quote.quoteNumber}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm truncate" title={quote.supplierName}>
                          {quote.supplierName}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Price Banner */}
                  <div className="bg-slate-50 rounded-xl p-3 my-2.5 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total</span>
                      <span className="font-mono text-lg font-bold text-slate-900">
                        {formatCurrency(quote.totalAmount)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {quote.items.length} items
                    </span>
                  </div>

                  {/* Terms */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <ClockIcon className="w-3.5 h-3.5" /> Lead Time:
                      </span>
                      <span className="font-medium text-slate-800 text-[11px]">{quote.deliveryLeadTime}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <CalendarIcon className="w-3.5 h-3.5" /> Valid Until:
                      </span>
                      <span className="font-mono text-slate-700 text-[11px]">{quote.validUntil}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePreviewQuote(quote);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>View Items</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleOpenDeleteModal(e, quote)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Delete quote"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quotation Detail Modal */}
      {activePreviewQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-100">
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 relative max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-[11px] text-slate-400 block">
                  {activePreviewQuote.quoteNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {activePreviewQuote.supplierName}
                </h3>
              </div>
              <button
                onClick={() => setActivePreviewQuote(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Terms overview */}
            <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-xl bg-slate-50 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Lead Time</span>
                <span className="font-semibold text-slate-800">{activePreviewQuote.deliveryLeadTime}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Valid Until</span>
                <span className="font-mono text-slate-800">{activePreviewQuote.validUntil}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Payment Terms</span>
                <span className="font-medium text-slate-800">{activePreviewQuote.paymentTerms}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden my-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePreviewQuote.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.description}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.unitPrice, 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Total Quotation:</span>
              <span className="font-mono font-bold text-base text-slate-900">
                {formatCurrency(activePreviewQuote.totalAmount)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={(e) => handleOpenDeleteModal(e, activePreviewQuote)}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Delete Quote</span>
              </button>

              <button
                onClick={() => {
                  onCompareQuotes([activePreviewQuote.id]);
                  setActivePreviewQuote(null);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Compare This Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {quotePendingDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150"
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
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Are you sure you want to delete quotation{" "}
                  <strong className="text-slate-900 font-mono">
                    {quotePendingDelete.quoteNumber}
                  </strong>{" "}
                  from{" "}
                  <strong className="text-slate-900">
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
                  This will permanently delete the quotation and all {quotePendingDelete.items.length} line items. This action cannot be undone.
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
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
        </div>
      )}
    </div>
  );
}
