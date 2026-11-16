"use client";

import React, { useState, useMemo } from "react";
import {
  ScaleIcon,
  ClockIcon,
  UploadCloudIcon,
  CheckIcon,
  SparklesIcon,
  TrendingDownIcon,
  ChartBarIcon,
  BuildingIcon,
  DocumentTextIcon,
} from "@/components/Icons";
import { Quotation } from "@/types/quotation";
import { formatCurrency } from "@/utils/format";

interface QuoteComparisonViewProps {
  allQuotations: Quotation[];
  initialSelectedIds?: string[];
  onOpenUpload: () => void;
  onNavigateToAnalysis?: () => void;
}

type ComparisonTab = "overview" | "item_variance" | "tradeoff" | "table";

// Distinct color accents for comparing different suppliers
const SUPPLIER_COLORS = [
  { bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-500", light: "bg-emerald-50", fill: "#10b981" },
  { bg: "bg-indigo-500", text: "text-indigo-700", border: "border-indigo-500", light: "bg-indigo-50", fill: "#6366f1" },
  { bg: "bg-sky-500", text: "text-sky-700", border: "border-sky-500", light: "bg-sky-50", fill: "#0ea5e9" },
  { bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-500", light: "bg-amber-50", fill: "#f59e0b" },
  { bg: "bg-purple-500", text: "text-purple-700", border: "border-purple-500", light: "bg-purple-50", fill: "#a855f7" },
  { bg: "bg-rose-500", text: "text-rose-700", border: "border-rose-500", light: "bg-rose-50", fill: "#f43f5e" },
];

export function QuoteComparisonView({
  allQuotations,
  initialSelectedIds = [],
  onOpenUpload,
  onNavigateToAnalysis,
}: QuoteComparisonViewProps) {
  const [activeViewTab, setActiveViewTab] = useState<ComparisonTab>("overview");

  // Selection of quotes to compare
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialSelectedIds.length >= 2) return initialSelectedIds;
    if (allQuotations.length >= 2) return allQuotations.map((q) => q.id);
    return allQuotations.map((q) => q.id);
  });

  const comparedQuotes = useMemo(() => {
    return allQuotations.filter((q) => selectedIds.includes(q.id));
  }, [allQuotations, selectedIds]);

  const toggleQuote = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Comparative calculations & analytics
  const analysis = useMemo(() => {
    if (comparedQuotes.length === 0) return null;

    const sortedByPrice = [...comparedQuotes].sort(
      (a, b) => a.totalAmount - b.totalAmount
    );
    const cheapest = sortedByPrice[0];
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1];

    const maxSavingsAmount = mostExpensive.totalAmount - cheapest.totalAmount;
    const maxSavingsPercent =
      mostExpensive.totalAmount > 0
        ? Math.round((maxSavingsAmount / mostExpensive.totalAmount) * 100)
        : 0;

    const sortedByDelivery = [...comparedQuotes].sort(
      (a, b) => a.deliveryDays - b.deliveryDays
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

    // Max values for chart axes normalization
    const maxTotalAmount = Math.max(...comparedQuotes.map((q) => q.totalAmount), 1);
    const maxDeliveryDays = Math.max(...comparedQuotes.map((q) => q.deliveryDays), 1);

    return {
      cheapest,
      mostExpensive,
      maxSavingsAmount,
      maxSavingsPercent,
      fastest,
      averageCost,
      uniqueItems,
      maxTotalAmount,
      maxDeliveryDays,
    };
  }, [comparedQuotes]);

  // Color mapping index per supplier
  const supplierColorMap = useMemo(() => {
    const map = new Map<string, typeof SUPPLIER_COLORS[0]>();
    comparedQuotes.forEach((q, idx) => {
      map.set(q.id, SUPPLIER_COLORS[idx % SUPPLIER_COLORS.length]);
    });
    return map;
  }, [comparedQuotes]);

  // ---------------------------------------------------------------------------
  // Empty State: < 2 quotations
  // ---------------------------------------------------------------------------
  if (allQuotations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
          <ChartBarIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Quotations to Compare</h3>
        <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
          Upload at least 2 supplier quotation PDFs to automatically view side-by-side cost comparison charts, item price variance, and lead-time analytics.
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

  if (allQuotations.length === 1) {
    const singleQuote = allQuotations[0];
    return (
      <div className="space-y-4 max-w-2xl mx-auto my-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ScaleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1 Quotation Stored ({singleQuote.supplierName})
              </h3>
              <p className="text-xs text-slate-500">
                Upload at least one more quotation to unlock comparative charts and trade-off analysis.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 mb-5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">
                {singleQuote.quoteNumber}
              </span>
              <span className="font-semibold text-slate-800">
                {singleQuote.supplierName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Total Quoted</span>
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
      {/* ======================================================== */}
      {/* 1. TOP SELECTION & VIEW CONTROLS */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Supplier Quotation Comparison Dashboard
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparing {comparedQuotes.length} of {allQuotations.length} uploaded quotations
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
              Toggle Quotes:
            </span>
            {allQuotations.map((q) => {
              const isSelected = selectedIds.includes(q.id);
              const color = supplierColorMap.get(q.id) || SUPPLIER_COLORS[0];
              return (
                <button
                  key={q.id}
                  onClick={() => toggleQuote(q.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/80"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${color.bg}`}
                  />
                  <span>{q.supplierName}</span>
                  <span className={`font-mono text-[11px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                    {formatCurrency(q.totalAmount)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToAnalysis && (
              <button
                onClick={onNavigateToAnalysis}
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
      {/* 2. EXECUTIVE METRIC KPI CARDS */}
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
            <div className="text-xs font-medium text-slate-700 truncate mt-1">
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
            <div className="text-xs text-slate-500 mt-1 leading-tight">
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
            <div className="text-xs font-medium text-slate-700 truncate mt-1">
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
              Cheapest is {Math.round(((analysis.averageCost - analysis.cheapest.totalAmount) / analysis.averageCost) * 100)}% below market average
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CHART TAB 1: TOTAL QUOTE VALUE (BAR & BREAKDOWN CHART) */}
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
                  <span className="text-slate-600 font-medium">Lowest Bid (Best Value)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-slate-600 font-medium">Other Quotes</span>
                </div>
              </div>
            </div>

            {/* Horizontal Comparative Bar Chart */}
            <div className="space-y-4">
              {comparedQuotes.map((q) => {
                const isCheapest = q.id === analysis.cheapest.id;
                const percentageOfMax = Math.round((q.totalAmount / analysis.maxTotalAmount) * 100);
                const deltaVsCheapest = q.totalAmount - analysis.cheapest.totalAmount;
                const percentVsCheapest =
                  analysis.cheapest.totalAmount > 0
                    ? Math.round((deltaVsCheapest / analysis.cheapest.totalAmount) * 100)
                    : 0;

                return (
                  <div key={q.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {q.supplierName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({q.quoteNumber})
                        </span>
                        {isCheapest && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Lowest Bid
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {deltaVsCheapest > 0 && (
                          <span className="text-[11px] font-mono text-rose-600 font-medium hidden sm:inline">
                            +{formatCurrency(deltaVsCheapest)} (+{percentVsCheapest}%)
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

          {/* Sourcing Recommendation Insight Box */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Procurement Decision Recommendation
              </h4>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Choosing <strong className="text-white font-semibold">{analysis.cheapest.supplierName}</strong> will save your organization{" "}
              <strong className="text-emerald-300 font-mono font-bold">{formatCurrency(analysis.maxSavingsAmount)}</strong> ({analysis.maxSavingsPercent}% less cost).
              {analysis.cheapest.id !== analysis.fastest.id ? (
                <span> However, if turnaround time is urgent, <strong className="text-white">{analysis.fastest.supplierName}</strong> delivers in <strong className="text-amber-300 font-mono">{analysis.fastest.deliveryDays} days</strong> ({analysis.cheapest.deliveryDays - analysis.fastest.deliveryDays} days faster).</span>
              ) : (
                <span> Remarkably, <strong className="text-white">{analysis.cheapest.supplierName}</strong> is also your fastest delivery option ({analysis.cheapest.deliveryDays} days)!</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CHART TAB 2: LINE ITEM PRICE VARIANCE CHART */}
      {/* ======================================================== */}
      {activeViewTab === "item_variance" && analysis && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Line-Item Unit Price Variance Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare individual product pricing across suppliers to spot overpricing or opportunities for split sourcing
            </p>
          </div>

          {analysis.uniqueItems.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No detailed line items detected for direct item-level comparison.
            </div>
          ) : (
            <div className="space-y-6">
              {analysis.uniqueItems.map((item, itemIdx) => {
                // Find minimum unit price for this specific item
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
                          Spread: {Math.round(((maxPrice - minPrice) / maxPrice) * 100)}% variance
                        </span>
                      )}
                    </div>

                    {/* Grouped Comparative Unit Price Bars */}
                    <div className="space-y-2">
                      {quoteEntries.map(([qId, val]) => {
                        const isCheapestForThisItem = val.unitPrice === minPrice;
                        const barWidthPercent =
                          maxPrice > 0 ? Math.round((val.unitPrice / maxPrice) * 100) : 50;

                        return (
                          <div key={qId} className="flex items-center gap-3 text-xs">
                            <div className="w-36 truncate font-medium text-slate-700">
                              {val.supplierName}
                            </div>

                            <div className="flex-1 bg-white h-7 rounded-lg border border-slate-200/80 p-0.5 overflow-hidden flex items-center">
                              <div
                                className={`h-full rounded-md transition-all duration-300 flex items-center px-2 text-[10px] font-semibold ${
                                  isCheapestForThisItem
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-300 text-slate-700"
                                }`}
                                style={{ width: `${Math.max(barWidthPercent, 20)}%` }}
                              >
                                {isCheapestForThisItem ? "Best Price" : ""}
                              </div>
                            </div>

                            <div className="w-24 text-right font-mono font-bold text-slate-900 text-xs">
                              {formatCurrency(val.unitPrice, 2)} / {item.unit || "unit"}
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
      {/* 5. CHART TAB 3: SPEED VS COST (2D TRADE-OFF MATRIX) */}
      {/* ======================================================== */}
      {activeViewTab === "tradeoff" && analysis && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cost vs Delivery Speed Trade-Off Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualize the trade-off between lead time turnaround and total quote cost
            </p>
          </div>

          {/* Quadrant Visualizer Card */}
          <div className="relative border border-slate-200 rounded-2xl p-6 bg-slate-50/50 min-h-[300px] flex flex-col justify-between">
            {/* Quadrant Legend Zones */}
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

            {/* Plotted Supplier Nodes */}
            <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {comparedQuotes.map((q) => {
                const isCheapest = q.id === analysis.cheapest.id;
                const isFastest = q.id === analysis.fastest.id;

                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {q.supplierName}
                      </span>
                      {isCheapest && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Lowest Price
                        </span>
                      )}
                      {!isCheapest && isFastest && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                          Fastest
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Lead Time</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {q.deliveryDays} Days
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Total Quoted</span>
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
      {/* 6. CHART TAB 4: DETAILED SPECIFICATION MATRIX */}
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
                      <th key={q.id} className="py-3 px-4 min-w-[200px]">
                        <span className="font-bold text-slate-900 text-xs block truncate">
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
                {/* Total Amount Row */}
                <tr className="bg-slate-50/40 font-semibold">
                  <td className="py-3 px-4 text-slate-800">Total Quotation</td>
                  {comparedQuotes.map((q) => {
                    const isCheapest = q.id === analysis.cheapest.id;
                    return (
                      <td key={q.id} className="py-3 px-4 font-mono font-bold">
                        <span className={isCheapest ? "text-emerald-600 text-sm" : "text-slate-900"}>
                          {formatCurrency(q.totalAmount)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Delivery Lead Time Row */}
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Lead Time</td>
                  {comparedQuotes.map((q) => (
                    <td key={q.id} className="py-2.5 px-4 font-medium text-slate-800">
                      {q.deliveryLeadTime} ({q.deliveryDays} days)
                    </td>
                  ))}
                </tr>

                {/* Validity Date Row */}
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Valid Until</td>
                  {comparedQuotes.map((q) => (
                    <td key={q.id} className="py-2.5 px-4 font-mono text-slate-700">
                      {q.validUntil}
                    </td>
                  ))}
                </tr>

                {/* Payment Terms Row */}
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Payment Terms</td>
                  {comparedQuotes.map((q) => (
                    <td key={q.id} className="py-2.5 px-4 text-slate-700">
                      {q.paymentTerms}
                    </td>
                  ))}
                </tr>

                {/* Line Items Count */}
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Line Items Extracted</td>
                  {comparedQuotes.map((q) => (
                    <td key={q.id} className="py-2.5 px-4 font-medium text-slate-700">
                      {q.items.length} items
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
