"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SparklesIcon,
  CheckIcon,
  ShieldCheckIcon,
  ScaleIcon,
  TrendingDownIcon,
  UploadCloudIcon,
  CopyIcon,
  AlertTriangleIcon,
  ChartBarIcon,
  ClockIcon,
} from "@/components/Icons";
import {
  analyzeQuotesWithAi,
  IntelligentAnalysisResult,
  RiskItem,
} from "@/services/api";
import { Quotation } from "@/types/quotation";
import { formatCurrency } from "@/utils/format";

interface IntelligentQuoteAnalysisViewProps {
  allQuotations: Quotation[];
  onOpenUpload: () => void;
  onNavigateToComparison: () => void;
}

type TabKey = "scorecards" | "risks" | "negotiation" | "split" | "roadmap";

export function IntelligentQuoteAnalysisView({
  allQuotations,
  onOpenUpload,
  onNavigateToComparison,
}: IntelligentQuoteAnalysisViewProps) {
  const [analysis, setAnalysis] = useState<IntelligentAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view tab & filters
  const [activeTab, setActiveTab] = useState<TabKey>("scorecards");
  const [riskSeverityFilter, setRiskSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<number | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [viewMode, setViewMode] = useState<"tabbed" | "all">("tabbed");

  // Fetch or trigger analysis
  const fetchAnalysis = async (forceRefresh: boolean = false) => {
    if (allQuotations.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await analyzeQuotesWithAi(undefined, forceRefresh);
      setAnalysis(result);
    } catch (err: any) {
      console.error("Failed to run AI analysis:", err);
      setError(err.message || "Failed to generate intelligent AI quotation analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allQuotations.length > 0 && !analysis) {
      fetchAnalysis(false);
    }
  }, [allQuotations.length]);

  // Find quotation matching the recommended supplier
  const recommendedQuote = useMemo(() => {
    if (!analysis) return null;
    return (
      allQuotations.find(
        (q) =>
          q.supplierName.toLowerCase() ===
          analysis.recommendedSupplierName?.toLowerCase()
      ) || allQuotations[0]
    );
  }, [analysis, allQuotations]);

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
          Upload at least one supplier quotation PDF to run AI-powered strategic procurement audits, risk detection, and negotiation battlecards.
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
      {/* 1. CLEAN HEADER: TITLE, CACHE STATUS & ACTIONS */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Strategic Sourcing Intelligence</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              {allQuotations.length} quote{allQuotations.length > 1 ? "s" : ""} evaluated
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Procurement Sourcing & Risk Intelligence
          </h2>

          {analysis && (
            <div className="flex items-center gap-2 mt-1.5">
              {analysis.isCached ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>⚡ Instant (Cached)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span>✨ Fresh AI Insight</span>
                </span>
              )}
              {analysis.generatedAt && (
                <span className="text-[11px] text-slate-400">
                  Generated {new Date(analysis.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToComparison}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ScaleIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Comparison Charts</span>
          </button>

          <button
            onClick={() => fetchAnalysis(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Re-run live analysis across all quotes"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Auditing Quotes...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Re-Run Analysis</span>
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
            onClick={() => fetchAnalysis(false)}
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
          <div className="max-w-sm mx-auto space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              Generating Procurement Intelligence...
            </h3>
            <p className="text-xs text-slate-500">
              Comparing pricing models, uncovering hidden risks, and synthesizing tactical negotiation counter-offers.
            </p>
          </div>
        </div>
      )}

      {/* Main Analysis Content */}
      {!isLoading && analysis && (
        <>
          {/* ======================================================== */}
          {/* 2. EXECUTIVE AWARD BRIEFING CARD (HERO) */}
          {/* ======================================================== */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
            {/* Subtle aesthetic backdrop blur */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              {/* Top Banner Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Recommended Award Decision</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExecutiveSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-200 transition-colors cursor-pointer"
                    title="Copy executive briefing to clipboard"
                  >
                    {copiedSummary ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold">Summary Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copy Briefing</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Vendor & Rationale */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {analysis.recommendedSupplierName}
                  </h3>
                  {recommendedQuote && (
                    <span className="text-xs font-mono text-slate-400">
                      Quote #{recommendedQuote.quoteNumber}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                  {analysis.recommendationReason}
                </p>
              </div>

              {/* 4 Clean Metric Mini-Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Award Bid Amount
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-white mt-0.5 block">
                    {recommendedQuote
                      ? formatCurrency(recommendedQuote.totalAmount, 2)
                      : "Competitive"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Projected Savings
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                    {analysis.projectedSavings > 0
                      ? `+${formatCurrency(analysis.projectedSavings)}`
                      : "Optimal Price"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Turnaround Lead Time
                  </span>
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-200 mt-0.5 block">
                    {recommendedQuote ? `${recommendedQuote.deliveryDays} Days` : "Standard"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    Strategic Confidence
                  </span>
                  <span className="text-base sm:text-lg font-bold text-indigo-300 mt-0.5 block">
                    High Confidence
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. INTERACTIVE SECTION TABS */}
          {/* ======================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setActiveTab("scorecards")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "scorecards" && viewMode === "tabbed"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <ChartBarIcon className="w-3.5 h-3.5" />
                <span>Supplier Scorecards ({analysis.supplierScores?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("risks")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "risks" && viewMode === "tabbed"
                    ? "bg-indigo-600 text-white shadow-2xs"
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "negotiation" && viewMode === "tabbed"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Negotiation Battlecards ({analysis.negotiationPoints?.length || 0})</span>
              </button>

              {analysis.splitSourcing && (
                <button
                  onClick={() => setActiveTab("split")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "split" && viewMode === "tabbed"
                      ? "bg-indigo-600 text-white shadow-2xs"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "roadmap" && viewMode === "tabbed"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Execution Plan ({analysis.strategicActionPlan.length})</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle: Tabbed vs View All */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
              <span>View:</span>
              <button
                onClick={() => setViewMode("tabbed")}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "tabbed"
                    ? "bg-slate-200 text-slate-800 font-bold"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Focused
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "all"
                    ? "bg-slate-200 text-slate-800 font-bold"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                View All
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: SUPPLIER SCORECARDS */}
          {/* ======================================================== */}
          {(viewMode === "all" || activeTab === "scorecards") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Comparative Supplier Scorecards
                  </h4>
                  <p className="text-xs text-slate-500">
                    Weighted 100-point evaluation across pricing, delivery fulfillment, payment terms, and risk profile.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.supplierScores?.map((score, idx) => {
                  const isTopRanked =
                    score.supplierName.toLowerCase() ===
                    analysis.recommendedSupplierName.toLowerCase();

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-5 border transition-all ${
                        isTopRanked
                          ? "border-indigo-600/70 bg-gradient-to-b from-indigo-50/20 to-white shadow-xs ring-2 ring-indigo-500/10"
                          : "border-slate-200/80 bg-white shadow-2xs hover:border-slate-300"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          {isTopRanked && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                              <CheckIcon className="w-2.5 h-2.5" />
                              <span>Recommended Winner</span>
                            </span>
                          )}
                          <h5 className="font-bold text-sm text-slate-900">
                            {score.supplierName}
                          </h5>
                          <span className="font-mono text-[10px] text-slate-400">
                            Quote #{score.quoteNumber}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Overall</span>
                          <span
                            className={`font-mono font-extrabold text-xl ${
                              score.overallScore >= 80
                                ? "text-emerald-600"
                                : score.overallScore >= 60
                                ? "text-slate-800"
                                : "text-amber-600"
                            }`}
                          >
                            {score.overallScore}
                            <span className="text-xs text-slate-400 font-normal">/100</span>
                          </span>
                        </div>
                      </div>

                      {/* Clean 4-Pillar Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Price Efficiency</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {score.priceScore}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Lead Time Speed</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {score.deliveryScore}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Terms Flexibility</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {score.termsScore}%
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Contract Safety</span>
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {score.riskScore}%
                          </span>
                        </div>
                      </div>

                      {/* Key Highlights */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
                        {score.strengths.slice(0, 2).map((str, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                            <CheckIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{str}</span>
                          </div>
                        ))}
                        {score.weaknesses.slice(0, 1).map((wk, wIdx) => (
                          <div key={wIdx} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span className="truncate">{wk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CONTRACT RISKS & HIDDEN CLAUSES */}
          {/* ======================================================== */}
          {(viewMode === "all" || activeTab === "risks") && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Contractual Risks & Hidden Terms Radar
                  </h4>
                  <p className="text-xs text-slate-500">
                    AI flags potential exposures such as tight price validity, upfront cash demands, and shipping liabilities.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {(["all", "high", "medium", "low"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setRiskSeverityFilter(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer capitalize ${
                        riskSeverityFilter === lvl
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lvl} ({riskCounts[lvl]})
                    </button>
                  ))}
                </div>
              </div>

              {filteredRisks.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center">
                  <ShieldCheckIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-800 block">
                    No {riskSeverityFilter !== "all" ? riskSeverityFilter : ""} risks detected
                  </span>
                  <span className="text-[11px] text-slate-500">
                    The analyzed quotes have favorable or low-risk commercial terms.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRisks.map((risk, idx) => {
                    const isHigh = risk.level === "high";
                    const isMed = risk.level === "medium";

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isHigh
                            ? "bg-rose-50/40 border-rose-200/80"
                            : isMed
                            ? "bg-amber-50/40 border-amber-200/80"
                            : "bg-slate-50/80 border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                isHigh
                                  ? "bg-rose-100 text-rose-800"
                                  : isMed
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {risk.level} Exposure
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {risk.affectedSupplier}
                            </span>
                          </div>
                        </div>

                        <h5 className="font-bold text-xs text-slate-900 mb-1">
                          {risk.title}
                        </h5>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {risk.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: TACTICAL NEGOTIATION BATTLECARDS */}
          {/* ======================================================== */}
          {(viewMode === "all" || activeTab === "negotiation") && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Tactical Negotiation Battlecards
                </h4>
                <p className="text-xs text-slate-500">
                  Leverage competitor quotes and market data to negotiate price discounts, credit terms, and delivery commitments.
                </p>
              </div>

              <div className="space-y-3.5">
                {analysis.negotiationPoints?.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {point.supplierName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          (Quote #{point.quoteNumber})
                        </span>
                      </div>

                      {point.potentialImpact && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                          Target Impact: {point.potentialImpact}
                        </span>
                      )}
                    </div>

                    {/* Leverage vs Recommended Strategy */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                          Competitive Leverage Fact
                        </span>
                        <p className="text-slate-700 leading-relaxed">
                          {point.leveragePoint}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                          Recommended Counter-Action
                        </span>
                        <p className="text-slate-700 leading-relaxed">
                          {point.recommendedAction}
                        </p>
                      </div>
                    </div>

                    {/* Full Email Counter-Offer Draft */}
                    {point.draftEmailSnippet && (
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Draft Counter-Offer Email:
                          </span>
                          <p className="text-xs text-slate-700 italic leading-relaxed">
                            "{point.draftEmailSnippet}"
                          </p>
                        </div>

                        <button
                          onClick={() => handleCopySnippet(point.draftEmailSnippet!, idx)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                        >
                          {copiedSnippetIdx === idx ? (
                            <>
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Copy Email Draft</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SPLIT-SOURCING ALLOCATION */}
          {/* ======================================================== */}
          {(viewMode === "all" || activeTab === "split") && analysis.splitSourcing && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-emerald-200/80 shadow-2xs bg-gradient-to-br from-emerald-50/20 to-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <TrendingDownIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Optimized Multi-Supplier Sourcing Strategy
                      </h4>
                      <p className="text-xs text-slate-500">
                        Allocating individual items to lowest-rate suppliers can yield superior overall financial savings.
                      </p>
                    </div>
                  </div>

                  {analysis.splitSourcing.potentialSavings > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold font-mono self-start sm:self-auto">
                      +{formatCurrency(analysis.splitSourcing.potentialSavings)} Additional Savings
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {analysis.splitSourcing.summary}
                </p>

                {/* Allocation Breakdown Table */}
                {analysis.splitSourcing.allocations?.length > 0 && (
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] font-semibold border-b border-slate-200/80">
                        <tr>
                          <th className="py-2.5 px-3">Item / Part</th>
                          <th className="py-2.5 px-3">Recommended Supplier</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Line Savings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysis.splitSourcing.allocations.map((alloc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {alloc.itemDescription}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-indigo-600">
                              {alloc.supplierName}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {alloc.suggestedQty}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                              {formatCurrency(alloc.unitPrice, 2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              +{formatCurrency(alloc.savingsVsHighest)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: STRATEGIC ACTION PLAN / ROADMAP */}
          {/* ======================================================== */}
          {(viewMode === "all" || activeTab === "roadmap") &&
            analysis.strategicActionPlan &&
            analysis.strategicActionPlan.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Procurement Execution Action Plan
                    </h4>
                    <p className="text-xs text-slate-500">
                      Step-by-step roadmap to finalize contracts and execute purchase orders smoothly.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {analysis.strategicActionPlan.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
