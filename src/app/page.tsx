import Link from "next/link";
import QuoteAnalyzerWorkbench from "@/components/QuoteAnalyzerWorkbench";
import RoiCalculator from "@/components/RoiCalculator";
import LandingAuthRedirect from "@/components/LandingAuthRedirect";
import {
  SparklesIcon,
  CheckIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  UsersIcon,
  SearchAnalysisIcon,
  AlertTriangleIcon,
  ChartBarIcon,
  ScaleIcon,
  CpuChipIcon,
} from "@/components/Icons";

export const metadata = {
  title: "QuoteGenie | AI Quote Analyser & Vendor Proposal Intelligence SaaS",
  description:
    "Stop overpaying on vendor quotes, agency proposals, and contractor SOWs. QuoteGenie analyzes rates against 1.2M+ benchmarks, detects hidden fees, and drafts negotiation counter-offers in seconds.",
};

const FEATURES = [
  {
    icon: ChartBarIcon,
    title: "1.2M+ Market Rate Benchmarking",
    description:
      "Instantly audit vendor hourly rates and milestone fees against verified industry percentiles across tech, logistics, and consulting.",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  {
    icon: AlertTriangleIcon,
    title: "Hidden Surcharge & Risk Radar",
    description:
      "Automatically flag ambiguous out-of-scope clauses, unmetered indexation fees, front-heavy deposits, and one-sided SLAs.",
    accent: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    icon: ScaleIcon,
    title: "Multi-Bid Apples-to-Apples Equalization",
    description:
      "Normalize disparate proposals across vendors with different billing units and deliverable scopes to find true best-value bids.",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    icon: SparklesIcon,
    title: "AI Counter-Offer & Negotiation Drafter",
    description:
      "Generate firm, data-backed counter-proposal emails citing specific market medians to negotiate 12% to 25% savings in 1 click.",
    accent: "bg-purple-50 text-purple-700 border-purple-100",
  },
  {
    icon: ShieldCheckIcon,
    title: "Enterprise Security & Privacy Vault",
    description:
      "All uploaded quotes are encrypted with AES-256 and never used to train public models. SOC 2 Type II compliant infrastructure.",
    accent: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  {
    icon: UsersIcon,
    title: "Multi-Seat Procurement Collaboration",
    description:
      "Grant stakeholders, finance directors, and project leads shared visibility with custom approval workflows and audit logs.",
    accent: "bg-pink-50 text-pink-700 border-pink-100",
  },
];

const INDUSTRIES = [
  { name: "IT Services & Cloud", count: "340k+ Data Points", badge: "AWS / Azure / DevOps" },
  { name: "Software & Mobile Agencies", count: "480k+ Data Points", badge: "Engineering & SOWs" },
  { name: "Logistics, Freight & 3PL", count: "190k+ Data Points", badge: "Warehousing & Drayage" },
  { name: "Marketing & Creative", count: "210k+ Data Points", badge: "Retainers & Media" },
  { name: "Facilities & Construction", count: "160k+ Data Points", badge: "Materials & Labor" },
  { name: "Legal & Advisory", count: "95k+ Data Points", badge: "Hourly & Retainers" },
];

const PRICING_PLANS = [
  {
    id: 1,
    name: "Starter",
    price: "$0",
    cadence: "Forever Free",
    description: "Ideal for solo operators and small teams auditing occasional vendor bids.",
    features: [
      "5 Deep Quote Audits per month",
      "Standard Market Rate Benchmarks",
      "Hidden Surcharge Detector",
      "Executive PDF Summary Export",
      "1 User Seat",
      "Community Support",
    ],
    cta: "Start Free Audit",
    popular: false,
  },
  {
    id: 2,
    name: "Professional",
    price: "$79",
    cadence: "per month",
    description: "Built for growing businesses and procurement teams maximizing budget ROI.",
    features: [
      "50 Deep Quote Audits per month",
      "1.2M+ Real-Time Market Benchmarks",
      "Multi-Bid Vendor Equalization",
      "AI Counter-Offer Email Drafter",
      "Contract Risk & SLA Clause Radar",
      "Up to 5 Team Seats",
      "Priority Email & Slack Support",
    ],
    cta: "Start 14-Day Pro Trial",
    popular: true,
  },
  {
    id: 3,
    name: "Enterprise",
    price: "$249",
    cadence: "per month",
    description: "For finance directors and sourcing leaders needing unlimited audit scale.",
    features: [
      "Unlimited Quote & SOW Audits",
      "Custom Enterprise Rate Cards & ERP Sync",
      "Automated Coupa & SAP Ingestion",
      "Unlimited Organization Seats",
      "Custom Contract Compliance Rules",
      "Dedicated Sourcing Analyst Support",
      "SOC 2 Type II Report & SLA Guarantees",
    ],
    cta: "Deploy Enterprise",
    popular: false,
  },
];

const FAQS = [
  {
    question: "What types of vendor quotes and proposals can QuoteGenie analyze?",
    answer:
      "QuoteGenie supports virtually any vendor quote format: PDF proposals, Microsoft Excel rate cards, Word SOW documents, scanned contracts, and raw email estimate text. Our multi-modal OCR extracts rate tables, line items, and payment schedules with over 99% accuracy.",
  },
  {
    question: "How does QuoteGenie benchmark vendor pricing?",
    answer:
      "Our benchmarking engine continuously aggregates over 1.2 million anonymized, verified commercial contract data points across North America, Europe, and APAC. It normalizes for geographic location, supplier tier, seniority level, and contract duration to give you accurate 25th, 50th, and 75th percentile market rates.",
  },
  {
    question: "Is our proprietary vendor pricing kept confidential?",
    answer:
      "Yes, absolutely. Your proposals and vendor names are encrypted at rest using AES-256 and in transit via TLS 1.3. We strictly adhere to SOC 2 Type II guidelines and your data is never shared with competitors or used to train public AI models.",
  },
  {
    question: "How much money can our organization realistically save?",
    answer:
      "Across thousands of audited proposals, our users recover an average of 14.8% in direct cost savings by identifying inflated line items, removing duplicate project management surcharges, and utilizing our AI-generated counter-offer negotiation scripts.",
  },
  {
    question: "Can I connect QuoteGenie to our existing ERP or Procurement system?",
    answer:
      "Yes. Our Enterprise tier includes pre-built connectors and REST APIs for SAP Ariba, Coupa, NetSuite, and QuickBooks, allowing automatic ingestion of incoming RFP responses.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-600 selection:text-white flex flex-col font-sans">
      {/* Redirect logged-in users directly to workspace */}
      <LandingAuthRedirect />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/80">
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

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#workbench" className="hover:text-slate-900 transition-colors">
              Live Analyzer
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Platform Features
            </a>
            <a href="#roi" className="hover:text-slate-900 transition-colors">
              ROI Calculator
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/workspace"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors hidden lg:block"
            >
              Workspace
            </Link>
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Analyze a Quote Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-white">
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white border-b border-slate-100">
          {/* Subtle Ambient Radial Accents */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo-100/40 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-emerald-100/30 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-xs font-medium text-slate-700 mb-8 shadow-xs hover:border-slate-300 transition-colors">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              <span className="text-indigo-600 font-semibold">Quote Intelligence v2.4</span>
              <span className="text-slate-300">•</span>
              <span>Audit vendor proposals against 1.2M+ live rate benchmarks</span>
              <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-5xl mx-auto leading-[1.1]">
              Never Overpay on Vendor Quotes Again.{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Analyze, Benchmark &amp; Negotiate
              </span>{" "}
              with AI.
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
              Upload any vendor quote, agency proposal, or contractor SOW. QuoteGenie instantly
              cross-examines line items against verified market benchmarks, catches hidden surcharges,
              and drafts data-backed counter-offers in seconds.
            </p>

            {/* CTA Group */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Start Analyzing Free (5 Audits)</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <a
                href="#workbench"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-base border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <SearchAnalysisIcon className="w-4 h-4 text-indigo-600" />
                <span>Try Interactive Analyzer Demo</span>
              </a>
            </div>

            {/* Social Proof Metric Bar */}
            <div className="mt-14 pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">$14.2M+</div>
                <div className="text-xs text-slate-500 mt-0.5">Procurement Cost Recovered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                  14.8%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Average Cost Reduction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">1.2M+</div>
                <div className="text-xs text-slate-500 mt-0.5">Verified Rate Benchmarks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono">
                  99.4%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">OCR Extraction Accuracy</div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKBENCH SECTION */}
        <section id="workbench" className="py-16 sm:py-24 relative bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
                <CpuChipIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Interactive Live Demo</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Experience the Quote Analyser in Action
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Select any vendor proposal below to watch QuoteGenie audit rate cards, expose
                hidden contract traps, and draft counter-offers with real benchmark citations.
              </p>
            </div>

            {/* Embedded Live Workbench */}
            <QuoteAnalyzerWorkbench />
          </div>
        </section>

        {/* SUPPORTED CATEGORIES / BENCHMARK SECTORS */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                  Comprehensive Sourcing Coverage
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                  Benchmarking Intelligence for Every Department
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                Whether reviewing cloud engineering rate cards or global freight contracts,
                QuoteGenie provides granular peer-level price transparency.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {INDUSTRIES.map((ind) => (
                <div
                  key={ind.name}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 hover:border-indigo-400 hover:shadow-xs transition-all group"
                >
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                    {ind.badge}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {ind.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">{ind.count}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3-STEP PIPELINE: HOW IT WORKS */}
        <section className="py-20 sm:py-28 relative bg-slate-50/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                The Intelligence Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                From Proposal Upload to Signed Savings in 3 Steps
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Eliminate spreadsheets and manual rate research. QuoteGenie turns days of procurement
                audits into a 60-second automated review.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-lg mb-6">
                  01
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Ingest Any Quote Format</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Drop vendor PDFs, Excel spreadsheets, SOW agreements, or scanned bids. Our OCR
                  engine extracts all line items, hourly rate cards, payment milestones, and legal terms.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center font-black text-lg mb-6">
                  02
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Deep Benchmark Audit</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every quoted fee is instantly benchmarked against 1.2M market transactions. Our risk
                  radar evaluates 45 contract hazards like uncapped overtime and skewed deposits.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black text-lg mb-6">
                  03
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">1-Click Counter-Offer</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Generate professional negotiation letters citing median benchmarks and target
                  pricing. Vendors immediately recognize you have institutional market data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID: FEATURES */}
        <section id="features" className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                Core Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                Built specifically for high-impact Quote Analysis
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Everything sourcing leads, finance leaders, and agency heads need to protect profit
                margins and maintain audit trails.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="relative bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 hover:border-slate-300 hover:shadow-md transition-all group overflow-hidden"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${feature.accent} mb-6 group-hover:scale-110 transition-transform`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ROI CALCULATOR SECTION */}
        <section id="roi" className="py-20 sm:py-28 relative bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RoiCalculator />
          </div>
        </section>

        {/* CUSTOMER TESTIMONIALS */}
        <section className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                Real Customer Impact
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                Trusted by Procurement Leaders Worldwide
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex text-amber-500 text-sm">★★★★★</div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  &quot;QuoteGenie caught a 38% markup on a vendor&apos;s cloud migration SOW that our
                  internal team missed. Using the generated counter-offer email, we saved $42,000 on
                  day one.&quot;
                </p>
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-sm font-bold text-slate-900">Marcus Vance</div>
                  <div className="text-xs text-slate-500">VP of Technology, FinScale Capital</div>
                </div>
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex text-amber-500 text-sm">★★★★★</div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  &quot;Reviewing RFP submissions from 4 different agencies used to take 2 weeks of
                  spreadsheet consolidation. The side-by-side bid equalization feature alone is worth
                  10x the monthly price.&quot;
                </p>
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-sm font-bold text-slate-900">Elena Rostova</div>
                  <div className="text-xs text-slate-500">Head of Strategic Sourcing, Apex Logistics</div>
                </div>
              </div>

              <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex text-amber-500 text-sm">★★★★★</div>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  &quot;The clause radar detected an ambiguous overtime clause that would have cost us
                  an estimated $60,000 in change orders. It literally paid for a decade of software in
                  one audit.&quot;
                </p>
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-sm font-bold text-slate-900">David Thorne</div>
                  <div className="text-xs text-slate-500">Chief Operating Officer, Lumina Bio</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-20 sm:py-28 relative bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                Transparent SaaS Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
                Simple plans that pay for themselves on your first quote
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Start free with 5 quote audits. Upgrade when your organization needs multi-seat
                sourcing teams and ERP integration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all bg-white ${
                    plan.popular
                      ? "border-2 border-indigo-600 shadow-xl shadow-indigo-600/10 scale-102"
                      : "border border-slate-200/90 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                      Most Popular for Procurement
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <span className="text-xs text-slate-500 font-mono">{plan.cadence}</span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono">
                        {plan.price}
                      </span>
                      {plan.price !== "$0" && (
                        <span className="text-xs text-slate-500">/ month</span>
                      )}
                    </div>

                    <p className="mt-3 text-xs sm:text-sm text-slate-600">{plan.description}</p>

                    <div className="my-6 border-t border-slate-200" />

                    <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <Link
                      href="/register"
                      className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                        plan.popular
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
                Everything you need to know about QuoteGenie
              </h2>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq) => (
                <div
                  key={faq.question}
                  className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 sm:p-6"
                >
                  <h3 className="text-base font-bold text-slate-900 mb-2">{faq.question}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM FINAL CALL TO ACTION */}
        <section className="py-20 sm:py-28 relative overflow-hidden bg-slate-50/60 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-14 shadow-xl shadow-slate-200/50">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Ready to eliminate cost leakage on your upcoming vendor proposals?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Join thousands of businesses auditing quotes with AI. Register your organization
              account in 30 seconds and receive 5 free audits.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg shadow-indigo-600/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <span>Create Free Organization Account</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <span className="text-sm font-black text-white">QG</span>
            </div>
            <span className="text-sm font-bold text-slate-900">QuoteGenie</span>
            <span className="text-xs text-slate-500">
              — AI Quote Analyser &amp; Proposal Intelligence Platform
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              All Systems Operational
            </span>
            <span>SOC 2 Type II Certified</span>
            <span>AES-256 Encrypted</span>
            <span>&copy; {new Date().getFullYear()} QuoteGenie Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
