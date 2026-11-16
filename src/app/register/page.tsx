import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";
import {
  CheckIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  AlertTriangleIcon,
} from "@/components/Icons";

export const metadata = {
  title: "Register Organization | QuoteGenie AI Quote Analyser",
  description:
    "Create your organization account to start auditing vendor quotes, benchmarking supplier rates against 1.2M market points, and drafting counter-offers.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <span className="text-xl font-black text-white tracking-wider">QG</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  QuoteGenie
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  AI Quote Analyser
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
          >
            <span>← Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Split-Screen Section */}
      <main className="flex-1 flex items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle Ambient Gradients */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-50 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-emerald-50 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          {/* Left Column: Visual Showcase & Social Proof */}
          <div className="lg:col-span-6 space-y-8 pr-0 lg:pr-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-4">
                <span>AI Sourcing &amp; Procurement Platform</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Stop overpaying on vendor quotes &amp; contracts
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Join forward-thinking finance and procurement leaders who use QuoteGenie to audit
                rate cards against 1.2M market benchmarks and recoup 14.8% on supplier proposals.
              </p>
            </div>

            {/* Core Value Props List */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ChartBarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Instant Rate Card Benchmarks</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare quoted hourly rates and milestones directly against 25th, 50th, and 75th percentile market data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Hidden Cost &amp; Risk Detection</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catch open-ended change order traps, asymmetric IP clauses, and skewed upfront deposit terms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Encrypted PostgreSQL Security</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Zero public LLM training on your proprietary quote data. SOC 2 compliant architecture.
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial Quote Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs relative">
              <div className="text-amber-500 text-xs tracking-widest mb-2 font-bold">
                ★★★★★ VERIFIED SOURCING REVIEW
              </div>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                &ldquo;We dropped a \$185,000 cloud engineering proposal into QuoteGenie. Within 45 seconds it flagged three overpriced rate cards and generated a counter-proposal that saved us \$32,000.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  MV
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Marcus Vance</div>
                  <div className="text-[11px] text-slate-500">VP of Engineering, FinScale Capital</div>
                </div>
              </div>
            </div>

            {/* Bottom Security Pill */}
            <div className="flex items-center gap-6 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                5 Free Deep Audits Included
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                Immediate Setup
              </span>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div className="lg:col-span-6 flex justify-center">
            <RegisterForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} QuoteGenie Inc. All rights reserved. Secure PostgreSQL &amp; Prisma Clean Architecture.</p>
      </footer>
    </div>
  );
}
