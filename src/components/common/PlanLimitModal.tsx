"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangleIcon, ScaleIcon, XIcon, CheckIcon, UploadCloudIcon } from "@/components/Icons";

export interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  limitType?: "comparisons" | "quotes_per_comparison" | "uploads" | "generic";
  onManageComparisons?: () => void;
  onManageQuotations?: () => void;
}

export default function PlanLimitModal({
  isOpen,
  onClose,
  title,
  message,
  limitType = "generic",
  onManageComparisons,
  onManageQuotations,
}: PlanLimitModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const defaultTitle =
    limitType === "comparisons"
      ? "Comparison Limit Reached"
      : limitType === "quotes_per_comparison"
      ? "Quotation Selection Limit"
      : limitType === "uploads"
      ? "Quotation Upload Limit"
      : "Free Plan Limit";

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto min-h-screen">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150 flex flex-col text-left relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-50/80 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              {limitType === "quotes_per_comparison" ? (
                <ScaleIcon className="w-5 h-5 text-amber-600" />
              ) : limitType === "uploads" ? (
                <UploadCloudIcon className="w-5 h-5 text-amber-600" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 mb-1">
                Free Plan Limit
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {title || defaultTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed relative z-10">
          <p>{message}</p>
        </div>

        {/* Plan Rules Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Free Plan Capabilities
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Up to <strong>4 uploaded quotations</strong> total</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Up to <strong>3 saved comparisons</strong> total</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Up to <strong>3 quotations evaluated</strong> per comparison</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Full AI quote analysis &amp; scoring</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 relative z-10">
          {onManageComparisons && limitType === "comparisons" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onManageComparisons();
              }}
              className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Manage Existing Comparisons
            </button>
          )}
          {onManageQuotations && limitType === "uploads" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onManageQuotations();
              }}
              className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Manage Existing Quotations
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer text-center"
          >
            Understood
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
