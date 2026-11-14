export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-xl font-black text-white tracking-wider">QG</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                QuoteGenie
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <a
              href="#features"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#preview"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Preview
            </a>
            <button className="text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 active:scale-95">
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-medium mb-6">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Next.js 16 • TypeScript • Tailwind CSS Ready
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
              Craft Intelligent, Professional Quotes in{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Seconds
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              QuoteGenie empowers freelancers and businesses to generate accurate estimates, customized PDF quotations, and seamless client approval workflows.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">
                Create First Quote
              </button>
              <a
                href="#features"
                className="px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-slate-200 font-semibold text-base transition-all"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* Live Preview Card Section */}
        <section id="preview" className="py-12 bg-slate-900/50 border-y border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl p-6 sm:p-8 backdrop-blur">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">
                    Sample Quotation
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">Invoice #QG-2026-001</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Prepared for Acme International</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● Ready to Send
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center text-sm py-2 border-b border-slate-900">
                  <span className="text-slate-300">Custom Web Application Development</span>
                  <span className="font-semibold text-white">$4,500.00</span>
                </div>
                <div className="flex justify-between items-center text-sm py-2 border-b border-slate-900">
                  <span className="text-slate-300">UI/UX Design System & Prototyping</span>
                  <span className="font-semibold text-white">$1,800.00</span>
                </div>
                <div className="flex justify-between items-center text-sm py-2 border-b border-slate-900">
                  <span className="text-slate-300">Cloud Infrastructure & CI/CD Setup</span>
                  <span className="font-semibold text-white">$950.00</span>
                </div>

                <div className="pt-4 flex justify-between items-center text-base sm:text-lg font-bold">
                  <span className="text-slate-200">Total Estimate</span>
                  <span className="text-indigo-400">$7,250.00</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to close deals faster
            </h2>
            <p className="mt-4 text-base text-slate-400">
              Modern tooling built with Next.js, React 19, and Tailwind CSS for peak speed and responsiveness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-bold mb-4">
                ⚡
              </div>
              <h3 className="text-lg font-semibold text-white">Instant Estimation</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Add line items, taxes, discounts, and custom currencies with real-time recalculations.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl font-bold mb-4">
                📄
              </div>
              <h3 className="text-lg font-semibold text-white">Branded PDF Export</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Generate clean, publication-ready PDF documents featuring your custom logo and company colors.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center text-xl font-bold mb-4">
                🤝
              </div>
              <h3 className="text-lg font-semibold text-white">Approval Tracking</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Share interactive links with clients to view, comment, and sign off directly online.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} QuoteGenie. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Documentation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
