"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckIcon, SparklesIcon } from "./Icons";
import { formatNumber } from "../utils/format";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

const INITIAL_ITEMS: QuoteItem[] = [
  {
    id: "item-1",
    description: "Next.js Full-Stack Application Architecture",
    quantity: 1,
    unitPrice: 3800,
  },
  {
    id: "item-2",
    description: "Interactive UI/UX Design System & Prototypes",
    quantity: 1,
    unitPrice: 1500,
  },
  {
    id: "item-3",
    description: "Cloud Database (PostgreSQL + Prisma) Deployment",
    quantity: 1,
    unitPrice: 950,
  },
];

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

export default function InteractiveQuoteDemo() {
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [items, setItems] = useState<QuoteItem[]>(INITIAL_ITEMS);
  const [taxRate, setTaxRate] = useState<number>(10);
  const [discount, setDiscount] = useState<number>(250);
  const [status, setStatus] = useState<"Draft" | "Pending Approval" | "Accepted">("Draft");

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      description: "API Integration & Automated E2E Testing",
      quantity: 1,
      unitPrice: 850,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
      {/* Decorative gradient blur in background */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Interactive Live Preview
            </span>
            <span className="text-xs text-slate-500 font-mono">QG-2026-LIVE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Web & Mobile Experience Overhaul
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Client: <span className="text-slate-200 font-medium">Hyperion Global Technologies</span>
          </p>
        </div>

        {/* Currency & Status Controls */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                onClick={() => setCurrency(curr)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  currency.code === curr.code
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {curr.code} ({curr.symbol})
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (status === "Draft") setStatus("Pending Approval");
              else if (status === "Pending Approval") setStatus("Accepted");
              else setStatus("Draft");
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              status === "Accepted"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : status === "Pending Approval"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            ● {status}
          </button>
        </div>
      </div>

      {/* Quote Items Table */}
      <div className="mt-6 space-y-3">
        <div className="hidden sm:grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-slate-500 px-3 pb-1">
          <div className="col-span-6">Deliverable</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Unit Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-2 sm:gap-0 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <div className="sm:col-span-6 flex items-center gap-2">
              <button
                onClick={() => removeItem(item.id)}
                title="Remove item"
                className="text-slate-500 hover:text-rose-400 text-xs px-1 transition-colors"
              >
                ✕
              </button>
              <span className="text-sm font-medium text-slate-200">
                {item.description}
              </span>
            </div>

            <div className="sm:col-span-2 flex items-center justify-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 sm:hidden">Qty:</span>
              <button
                onClick={() => updateQuantity(item.id, -1)}
                className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center transition-colors"
              >
                -
              </button>
              <span className="text-xs font-mono font-semibold text-white w-5 text-center">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, 1)}
                className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>

            <div className="sm:col-span-2 text-right text-xs font-mono text-slate-400 hidden sm:block">
              {currency.symbol}
              {formatNumber(item.unitPrice)}
            </div>

            <div className="sm:col-span-2 text-right font-mono font-bold text-sm text-indigo-300 w-full sm:w-auto flex justify-between sm:justify-end items-center">
              <span className="text-xs text-slate-400 sm:hidden">Item Total:</span>
              <span>
                {currency.symbol}
                {formatNumber(item.quantity * item.unitPrice)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={addItem}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:border-indigo-500 bg-slate-800/60 hover:bg-slate-800 text-indigo-300 transition-all flex items-center gap-1.5"
        >
          <span>+ Add Custom Deliverable</span>
        </button>
        <span className="text-xs text-slate-500 italic">
          Try adjusting quantities or currencies
        </span>
      </div>

      {/* Financial Summary */}
      <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
        {/* Tax & Discount Sliders */}
        <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Applied Tax Rate: {taxRate}%</span>
              <span>
                +{currency.symbol}
                {formatNumber(taxAmount, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
              <span>Client Discount ({currency.symbol})</span>
              <span className="text-emerald-400">
                -{currency.symbol}
                {discount}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="space-y-2 text-sm text-right bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Subtotal:</span>
            <span className="font-mono text-slate-200">
              {currency.symbol}
              {formatNumber(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Discount:</span>
            <span className="font-mono text-emerald-400">
              -{currency.symbol}
              {formatNumber(discount)}
            </span>
          </div>
          <div className="flex justify-between text-slate-400 text-xs">
            <span>Tax ({taxRate}%):</span>
            <span className="font-mono text-slate-200">
              +{currency.symbol}
              {formatNumber(taxAmount, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="font-bold text-white text-base">Grand Total:</span>
            <span className="text-2xl font-black font-mono bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              {currency.symbol}
              {formatNumber(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom CTA Banner */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <SparklesIcon className="w-4 h-4 text-indigo-400" />
          <span>Save this estimate template and send it with custom branding.</span>
        </div>
        <Link
          href="/register"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs tracking-wide shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
        >
          <span>Save & Export PDF</span>
          <CheckIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
