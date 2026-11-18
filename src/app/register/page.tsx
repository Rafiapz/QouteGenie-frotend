import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";
import { ScaleIcon, ChartBarIcon, SparklesIcon } from "@/components/Icons";

export const metadata = {
  title: "Register | QuoteGenie",
  description: "Create your QuoteGenie account to analyze and benchmark vendor quotations.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs">
              <span className="text-sm font-black text-white">QG</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              QuoteGenie
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Minimal Details About The Application */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
                Quotation Intelligence Platform
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Streamline supplier quotes &amp; procurement.
              </h1>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                Create your account to start uploading proposals, evaluating multi-supplier bids, and optimizing procurement costs.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ScaleIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Side-by-Side Comparison</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Benchmark quotes across total cost, line items, and settlement terms in one unified view.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ChartBarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Line-Item Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Inspect unit rates, quantities, and delivery milestones with precision.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Quote Analysis</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Receive data-driven recommendations on supplier split allocation and scope coverage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-6 flex justify-center">
            <RegisterForm />
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-5 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} QuoteGenie. All rights reserved.</p>
      </footer>
    </div>
  );
}