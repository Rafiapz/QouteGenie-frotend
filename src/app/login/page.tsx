import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import {
  CheckIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  SparklesIcon,
} from "@/components/Icons";

export const metadata = {
  title: "Sign In | QuoteGenie AI Quote Analyser",
  description:
    "Log in to your QuoteGenie organization account to audit vendor proposals, benchmark supplier rates against 1.2M market points, and generate counter-offers.",
};

export default function LoginPage() {
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
                <span>Enterprise Quote Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Welcome back to your Quote Intelligence Hub
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Log in to inspect your team&apos;s active proposal audits, compare incoming vendor rate cards, and generate counter-offers with market benchmark data.
              </p>
            </div>

            {/* Core Value Props List */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ChartBarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">1.2M+ Live Rate Benchmarks</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Access real-time P50 and P75 rate card percentiles across 6 major enterprise sectors.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Automated Counter-Offer Scripts</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Export ready-to-send procurement letters with verified market delta citations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">SOC 2 Encrypted Vault</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your proprietary vendor pricing and contracts remain private and confidential.
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
                &ldquo;Our sourcing team uses QuoteGenie on every contractor proposal exceeding \$50k. It has saved us over \$140,000 this year alone.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  ER
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Elena Rostova</div>
                  <div className="text-[11px] text-slate-500">Head of Strategic Sourcing, Apex Logistics</div>
                </div>
              </div>
            </div>

            {/* Bottom Security Pill */}
            <div className="flex items-center gap-6 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                Instant Access
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                256-bit AES Encryption
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                Audit Logs Kept
              </span>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-6 flex justify-center">
            <LoginForm />
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
