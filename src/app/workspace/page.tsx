"use client";

import React, { useState, useSyncExternalStore, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BuildingIcon,
  LogOutIcon,
  DocumentTextIcon,
  TruckIcon,
  SparklesIcon,
  MenuIcon,
  XIcon,
  FolderIcon,
} from "@/components/Icons";
import {
  logoutOrganization,
  getQuotesFromApi,
  getComparisonsFromApi,
  createComparisonInApi,
} from "@/services/api";
import {
  generateDefaultComparisonName,
  getLocalStoredComparisons,
  saveLocalStoredComparisons,
} from "@/services/comparisonStorage";
import { SupplierManagement } from "@/components/SupplierManagement";
import { QuotationsList } from "@/components/quotations/QuotationsList";
import { QuoteUploadWorkflow } from "@/components/quotations/QuoteUploadWorkflow";
import { IntelligentQuoteAnalysisView } from "@/components/quotations/IntelligentQuoteAnalysisView";
import { ComparisonSidebar } from "@/components/quotations/ComparisonSidebar";
import { getStoredQuotations } from "@/services/quotationStorage";
import { Quotation, QuoteComparisonRecord } from "@/types/quotation";

interface UserSession {
  id: string;
  email: string;
  companyName: string;
  plan: number;
  createdAt: string;
}

const EMPTY_USER: UserSession = {
  id: "",
  email: "",
  companyName: "Organization",
  plan: 1,
  createdAt: "",
};

function subscribeUserStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getUserSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("quotegenie_user");
}

function getServerUserSnapshot(): string | null {
  return null;
}

type WorkspaceTab = "quotations" | "upload" | "ai_analysis" | "suppliers";

export default function WorkspacePage() {
  const router = useRouter();

  const userJson = useSyncExternalStore(
    subscribeUserStorage,
    getUserSnapshot,
    getServerUserSnapshot
  );

  const currentUser: UserSession = userJson
    ? (() => {
        try {
          return JSON.parse(userJson);
        } catch {
          return EMPTY_USER;
        }
      })()
    : EMPTY_USER;

  // Protect route: redirect to login if unauthenticated
  useEffect(() => {
    const storedUser = localStorage.getItem("quotegenie_user");
    const storedToken = localStorage.getItem("quotegenie_token");
    if (!storedUser && !storedToken) {
      router.replace("/login");
    }
  }, [router]);

  // Tab & quotations state
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("quotations");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [comparisons, setComparisons] = useState<QuoteComparisonRecord[]>([]);
  const [aiAnalysisQuoteIds, setAiAnalysisQuoteIds] = useState<string[] | undefined>(undefined);
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Mobile navigation drawers
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileComparisonsOpen, setIsMobileComparisonsOpen] = useState(false);

  // Client hydration check & local comparisons load
  useEffect(() => {
    setIsMounted(true);
    const stored = getLocalStoredComparisons();
    if (stored.length > 0) {
      setComparisons(stored);
    }
  }, []);

  // Load stored quotations from local store & PostgreSQL backend
  useEffect(() => {
    const stored = getStoredQuotations();
    setQuotations(stored);

    getQuotesFromApi()
      .then((dbQuotes) => {
        if (dbQuotes && Array.isArray(dbQuotes)) {
          const mapped: Quotation[] = dbQuotes.map((q: any) => ({
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
          }));

          setQuotations(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Load comparisons from backend PostgreSQL
  useEffect(() => {
    getComparisonsFromApi()
      .then((records) => {
        if (records && Array.isArray(records)) {
          setComparisons(records);
          saveLocalStoredComparisons(records);
        }
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await logoutOrganization();
    router.push("/login");
  };

  const handleQuotationSaved = (newQuote: Quotation) => {
    setQuotations((prev) => [newQuote, ...prev.filter((q) => q.id !== newQuote.id)]);
    setActionNotice(`Quotation "${newQuote.quoteNumber}" verified and stored.`);
    setTimeout(() => setActionNotice(null), 3500);
    setActiveTab("quotations");
  };

  const handleQuotationsChange = (updated: Quotation[]) => {
    if (updated.length < quotations.length) {
      setActionNotice("Quotation deleted successfully.");
      setTimeout(() => setActionNotice(null), 3500);
    }
    setQuotations(updated);
  };

  const handleStartComparison = async (quoteIds: string[]) => {
    try {
      const records = await getComparisonsFromApi();
      const currentSorted = [...quoteIds].sort().join(",");
      const matching = (records || []).find((c: QuoteComparisonRecord) => {
        const cSorted = [...(c.quoteIds || [])].sort().join(",");
        return cSorted === currentSorted;
      });

      if (matching) {
        setAiAnalysisQuoteIds(undefined);
        setActiveComparisonId(matching.id);
      } else {
        const selectedQuotes = quotations.filter((q) => quoteIds.includes(q.id));
        const autoName = generateDefaultComparisonName(selectedQuotes);
        const created = await createComparisonInApi({
          name: autoName,
          quoteIds,
        });
        setComparisons((prev) => {
          const next = [created, ...prev.filter((c) => c.id !== created.id)];
          saveLocalStoredComparisons(next);
          return next;
        });
        setAiAnalysisQuoteIds(undefined);
        setActiveComparisonId(created.id);
      }
    } catch {
      setAiAnalysisQuoteIds(quoteIds);
      setActiveComparisonId(`local_${Date.now()}`);
    }
    setActiveTab("ai_analysis");
  };

  const handleSelectComparison = useCallback((comparisonId: string | null) => {
    setAiAnalysisQuoteIds(undefined);
    setActiveComparisonId(comparisonId);
  }, []);

  const handleNavigateToAnalysis = useCallback((quoteIds?: string[], comparisonId?: string | null) => {
    if (quoteIds) setAiAnalysisQuoteIds(quoteIds);
    if (comparisonId !== undefined) {
      setActiveComparisonId((prev) => (prev !== comparisonId ? comparisonId : prev));
    }
    setActiveTab("ai_analysis");
  }, []);

  const navItems = [
    {
      id: "quotations" as WorkspaceTab,
      label: "Quotations",
      icon: DocumentTextIcon,
      count: isMounted && quotations.length > 0 ? quotations.length : null,
    },
    {
      id: "upload" as WorkspaceTab,
      label: "Upload & Extract",
      icon: SparklesIcon,
      count: null,
    },
    {
      id: "ai_analysis" as WorkspaceTab,
      label: "AI Sourcing Intelligence",
      icon: SparklesIcon,
      count: isMounted && comparisons.length > 0 ? comparisons.length : null,
    },
    {
      id: "suppliers" as WorkspaceTab,
      label: "Suppliers",
      icon: TruckIcon,
      count: null,
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "QG";
  };

  const isComparisonContext = activeTab === "ai_analysis";

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* ======================================================== */}
      {/* 1. TOP PRIMARY NAVIGATION BAR (STICKY)                  */}
      {/* ======================================================== */}
      <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-2xs">
        {/* Left Side: Brand Logo & Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 md:hidden cursor-pointer"
            title="Open Menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <Link href="/workspace" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs text-white font-black text-sm group-hover:bg-indigo-700 transition-colors shrink-0">
              QG
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                QuoteGenie
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none hidden sm:block">
                Procurement Suite
              </span>
            </div>
          </Link>

          {/* Mobile Comparison Sidebar Toggle Button (Only on Compare & AI views) */}
          {isComparisonContext && (
            <button
              onClick={() => setIsMobileComparisonsOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold cursor-pointer"
              title="Open Comparisons List"
            >
              <FolderIcon className="w-3.5 h-3.5" />
              <span>Comparisons</span>
              {isMounted && comparisons.length > 0 && (
                <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-indigo-200/60 text-indigo-900">
                  {comparisons.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Center: Top Navigation Menu Tabs */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? "text-indigo-400" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>

                {item.count !== null && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono leading-none ${
                      isActive
                        ? "bg-white/20 text-white font-bold"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Account Profile & Organization Info */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <BuildingIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span
              suppressHydrationWarning
              className="font-medium max-w-[130px] truncate"
            >
              {currentUser.companyName || "Organization"}
            </span>
          </div>

          <div
            suppressHydrationWarning
            className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 cursor-default"
            title={`${currentUser.companyName || "Organization"} (${currentUser.email || "Signed in"})`}
          >
            {isMounted ? getInitials(currentUser.companyName) : "QG"}
          </div>

          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
            title="Sign Out"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MOBILE MAIN MENU DRAWER (OVERLAY)                     */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white h-full flex flex-col shadow-xl z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                  QG
                </div>
                <span className="font-bold text-slate-900 text-sm">QuoteGenie</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white font-bold shadow-xs"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-indigo-400" : "text-slate-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== null && item.count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                          isActive
                            ? "bg-white/20 text-white font-bold"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100">
              <div className="mb-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {getInitials(currentUser.companyName)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {currentUser.companyName || "Organization"}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {currentUser.email || "Signed in"}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
              >
                <LogOutIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MOBILE COMPARISONS DRAWER (OVERLAY)                   */}
      {/* ======================================================== */}
      {isMobileComparisonsOpen && isComparisonContext && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileComparisonsOpen(false)}
          />
          <div className="relative w-80 bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <ComparisonSidebar
              className="w-full bg-white flex flex-col h-full"
              comparisons={comparisons}
              allQuotations={quotations}
              activeComparisonId={activeComparisonId}
              onSelectComparison={(comparisonId) => {
                handleSelectComparison(comparisonId);
                setIsMobileComparisonsOpen(false);
              }}
              onComparisonsChange={(updated) => {
                setComparisons(updated);
              }}
              onOpenUpload={() => {
                setIsMobileComparisonsOpen(false);
                setActiveTab("upload");
              }}
              onCloseMobile={() => setIsMobileComparisonsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          <SparklesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. WORKSPACE BODY: 2-COLUMN COMPARISON OR FULL-WIDTH    */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {isComparisonContext ? (
          <>
            {/* Desktop Left Comparisons Sidebar (Fixed on the left) */}
            <ComparisonSidebar
              comparisons={comparisons}
              allQuotations={quotations}
              activeComparisonId={activeComparisonId}
              onSelectComparison={handleSelectComparison}
              onComparisonsChange={(updated) => {
                setComparisons(updated);
              }}
              onOpenUpload={() => setActiveTab("upload")}
            />

            {/* Right Main Content Panel (Offset by fixed sidebar md:ml-72) */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0 md:ml-72 h-full">
              {activeTab === "ai_analysis" && (
                <IntelligentQuoteAnalysisView
                  allQuotations={quotations}
                  comparisons={comparisons}
                  onComparisonsChange={setComparisons}
                  scopedQuoteIds={aiAnalysisQuoteIds}
                  initialComparisonId={activeComparisonId}
                  onOpenUpload={() => setActiveTab("upload")}
                  onComparisonChange={handleSelectComparison}
                />
              )}
            </main>
          </>
        ) : (
          /* Standard Full-Width Views (Quotations, Upload, Suppliers) */
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-h-0 h-full">
            {activeTab === "quotations" && (
              <QuotationsList
                quotations={quotations}
                onQuotationsChange={handleQuotationsChange}
                onOpenUpload={() => setActiveTab("upload")}
                onCompareQuotes={handleStartComparison}
              />
            )}

            {activeTab === "upload" && (
              <QuoteUploadWorkflow
                onQuotationSaved={handleQuotationSaved}
                onCancel={() => setActiveTab("quotations")}
              />
            )}

            {activeTab === "suppliers" && <SupplierManagement />}
          </main>
        )}
      </div>
    </div>
  );
}