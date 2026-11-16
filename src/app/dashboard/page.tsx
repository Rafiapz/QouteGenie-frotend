"use client";

import React, { useState, useSyncExternalStore, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BuildingIcon,
  LogOutIcon,
  DocumentTextIcon,
  ScaleIcon,
  TruckIcon,
  SparklesIcon,
  MenuIcon,
  XIcon,
} from "@/components/Icons";
import { logoutOrganization, getQuotesFromApi } from "@/services/api";
import { SupplierManagement } from "@/components/SupplierManagement";
import { QuotationsList } from "@/components/quotations/QuotationsList";
import { QuoteUploadWorkflow } from "@/components/quotations/QuoteUploadWorkflow";
import { QuoteComparisonView } from "@/components/quotations/QuoteComparisonView";
import { IntelligentQuoteAnalysisView } from "@/components/quotations/IntelligentQuoteAnalysisView";
import { getStoredQuotations } from "@/services/quotationStorage";
import { Quotation } from "@/types/quotation";

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

type DashboardTab = "quotations" | "upload" | "compare" | "ai_analysis" | "suppliers";

export default function DashboardPage() {
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
  const [activeTab, setActiveTab] = useState<DashboardTab>("quotations");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [compareQuoteIds, setCompareQuoteIds] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Mobile sidebar drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleStartComparison = (quoteIds: string[]) => {
    setCompareQuoteIds(quoteIds);
    setActiveTab("compare");
  };

  const navItems = [
    {
      id: "quotations" as DashboardTab,
      label: "Quotations",
      icon: DocumentTextIcon,
      count: quotations.length,
    },
    {
      id: "upload" as DashboardTab,
      label: "Upload & Extract",
      icon: SparklesIcon,
      count: null,
    },
    {
      id: "compare" as DashboardTab,
      label: "Comparison & Charts",
      icon: ScaleIcon,
      count: quotations.length >= 2 ? quotations.length : null,
    },
    {
      id: "ai_analysis" as DashboardTab,
      label: "AI Sourcing Intelligence",
      icon: SparklesIcon,
      count: null,
    },
    {
      id: "suppliers" as DashboardTab,
      label: "Suppliers",
      icon: TruckIcon,
      count: null,
    },
  ];

  const getPageTitle = () => {
    switch (activeTab) {
      case "quotations":
        return "Quotations";
      case "upload":
        return "Upload & AI Extraction";
      case "compare":
        return "Comparison & Charts Dashboard";
      case "ai_analysis":
        return "AI Strategic Sourcing & Risk Intelligence";
      case "suppliers":
        return "Suppliers";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "QG";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* ======================================================== */}
      {/* 1. DESKTOP LEFT SIDEBAR */}
      {/* ======================================================== */}
      <aside className="w-60 bg-white border-r border-slate-200/80 hidden md:flex md:flex-col shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs text-white font-black text-sm group-hover:bg-indigo-700 transition-colors shrink-0">
              QG
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              QuoteGenie
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.count !== null && item.count > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                      isActive
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer / Account Profile */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                {getInitials(currentUser.companyName)}
              </div>
              <div className="min-w-0">
                <span
                  suppressHydrationWarning
                  className="text-xs font-semibold text-slate-800 block truncate leading-tight"
                >
                  {currentUser.companyName || "Organization"}
                </span>
                <span className="text-[10px] text-slate-400 block truncate leading-tight">
                  {currentUser.email || "Signed in"}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE SIDEBAR DRAWER (OVERLAY) */}
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                      isActive
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-indigo-600" : "text-slate-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== null && item.count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 font-mono">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold"
              >
                <LogOutIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN WORKSPACE CONTENT */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Slim Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 md:hidden"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <BuildingIcon className="w-3.5 h-3.5 text-slate-400" />
              <span
                suppressHydrationWarning
                className="font-medium max-w-[140px] truncate"
              >
                {currentUser.companyName || "Organization"}
              </span>
            </div>
          </div>
        </header>

        {/* Action Notification Toast */}
        {actionNotice && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
            <SparklesIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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

          {activeTab === "compare" && (
            <QuoteComparisonView
              allQuotations={quotations}
              initialSelectedIds={compareQuoteIds}
              onOpenUpload={() => setActiveTab("upload")}
              onNavigateToAnalysis={() => setActiveTab("ai_analysis")}
            />
          )}

          {activeTab === "ai_analysis" && (
            <IntelligentQuoteAnalysisView
              allQuotations={quotations}
              onOpenUpload={() => setActiveTab("upload")}
              onNavigateToComparison={() => setActiveTab("compare")}
            />
          )}

          {activeTab === "suppliers" && <SupplierManagement />}
        </main>
      </div>
    </div>
  );
}
