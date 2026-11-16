"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrendingDownIcon, ArrowRightIcon, SparklesIcon } from "./Icons";
import { formatNumber } from "../utils/format";

export default function RoiCalculator() {
  const [annualSpend, setAnnualSpend] = useState<number>(750000);
  const [quotesPerMonth, setQuotesPerMonth] = useState<number>(12);

  // Benchmarked savings rate: average 14.8% on reviewed quotes
  const estimatedSavings = Math.round(annualSpend * 0.148);
  // Average 3.5 hours saved per quote review through automated parsing & rate matching
  const hoursSavedPerYear = Math.round(quotesPerMonth * 3.5 * 12);
  // ROI multiple calculated against Pro plan ($79/mo = $948/yr)
  const proAnnualCost = 948;
  const roiMultiple = Math.max(1, Math.round(estimatedSavings / proAnnualCost));

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-slate-200/60 relative overflow-hidden text-slate-900">
      {/* Background accents */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Inputs */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Interactive ROI Simulator</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Calculate your organization&apos;s cost recovery potential
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed">
            Enter your approximate annual external spend on vendors, agencies, and contractors to see
            how much cost leakage QuoteGenie eliminates.
          </p>

          {/* Slider 1: Annual Spend */}
          <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-700">Annual External Vendor Spend</span>
              <span className="font-mono font-bold text-slate-900 text-base">
                ${formatNumber(annualSpend)}
              </span>
            </div>
            <input
              type="range"
              min={100000}
              max={5000000}
              step={50000}
              value={annualSpend}
              onChange={(e) => setAnnualSpend(Number(e.target.value))}
              className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>$100k</span>
              <span>$2.5M</span>
              <span>$5M+</span>
            </div>
          </div>

          {/* Slider 2: Quotes Reviewed per Month */}
          <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-700">
                Vendor Quotes &amp; SOWs Reviewed Monthly
              </span>
              <span className="font-mono font-bold text-slate-900 text-base">
                {quotesPerMonth} proposals / mo
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={60}
              step={1}
              value={quotesPerMonth}
              onChange={(e) => setQuotesPerMonth(Number(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>2 / mo</span>
              <span>30 / mo</span>
              <span>60+ / mo</span>
            </div>
          </div>
        </div>

        {/* Right Output Card */}
        <div className="lg:col-span-6 bg-gradient-to-br from-indigo-50/60 via-white to-emerald-50/60 border border-indigo-100 rounded-3xl p-6 sm:p-8 space-y-6 relative shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-indigo-700">
              Projected Annual Impact
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
              <TrendingDownIcon className="w-3.5 h-3.5 text-emerald-600" />
              14.8% Average Savings
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-medium">Estimated Direct Savings</span>
            <div className="text-3xl sm:text-5xl font-black text-emerald-700 font-mono tracking-tight mt-1">
              ${formatNumber(estimatedSavings)}
              <span className="text-lg sm:text-2xl text-slate-400 font-normal"> / year</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Based on empirical rate adjustments across IT, software, marketing, and logistics quotes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Audit Time Saved</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-1">
                {hoursSavedPerYear} hrs
                <span className="text-xs text-slate-400 font-normal"> / yr</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Software ROI Multiple</span>
              <div className="text-xl sm:text-2xl font-bold text-indigo-700 font-mono mt-1">
                {roiMultiple}x
                <span className="text-xs text-slate-400 font-normal"> Return</span>
              </div>
            </div>
          </div>

          <Link
            href="/register"
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Lock In These Savings for Your Org</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
