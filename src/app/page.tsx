import Link from "next/link";
import LandingAuthRedirect from "@/components/LandingAuthRedirect";
import {
  CheckIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ScaleIcon,
  SparklesIcon,
} from "@/components/Icons";

export const metadata = {
  title: "QuoteGenie | Intelligent Quotation Sourcing & Analysis",
  description:
    "Compare supplier quotations side-by-side, benchmark costs across line items, and make data-driven procurement decisions with QuoteGenie.",
};

const FEATURES = [
  {
    icon: ChartBarIcon,
    title: "Line-Item Extraction",
    description:
      "Automatically ingest quotations to extract line items, quantities, unit prices, and delivery terms with high accuracy.",
  },
  {
    icon: ScaleIcon,
    title: "Side-by-Side Comparison",
    description:
      "Normalize disparate vendor bids to compare total quoted value, unit rates, lead times, and payment terms side by side.",
  },
  {
    icon: SparklesIcon,
    title: "AI Quote Analysis",
    description:
      "Receive smart vendor allocation strategies, spot scope gaps or missing items, and identify cost-saving opportunities.",
  },
];

const PRICING_PLANS = [
  {
    id: 1,
    name: "Starter",
    price: "₹0",
    cadence: "Free Forever",
    description: "Full access to quotation analysis and side-by-side sourcing comparisons.",
    features: [
      "Quotation upload & line-item parsing",
      "Side-by-side quotation comparisons",
      "Line-item rate extraction",
      "AI quote analysis & allocation",
    ],
    cta: "Get Started Free",
    popular: true,
    available: true,
  },
  {
    id: 2,
    name: "Professional",
    price: "Coming Soon",
    cadence: "",
    description: "For procurement teams looking for multi-seat team collaboration.",
    features: [
      "Multi-seat team organization",
      "Automated procurement approvals",
      "Priority support",
    ],
    cta: "Coming Soon",
    popular: false,
    available: false,
  },
  {
    id: 3,
    name: "Enterprise",
    price: "Coming Soon",
    cadence: "",
    description: "For organizations with custom ERP and procurement workflows.",
    features: [
      "Custom ERP & accounting integration",
      "Dedicated account management",
      "Custom procurement rules",
    ],
    cta: "Coming Soon",
    popular: false,
    available: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-600 selection:text-white flex flex-col font-sans">
      {/* Redirect logged-in users directly to workspace */}
      <LandingAuthRedirect />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs">
              <span className="text-sm font-black text-white">QG</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              QuoteGenie
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Intelligent Quotation Sourcing &amp; Analysis
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Compare supplier quotations side-by-side, benchmark costs across line items,
            and make data-driven procurement decisions with speed and accuracy.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/workspace"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center"
            >
              Open Workspace
            </Link>
          </div>
        </section>

        {/* CORE CAPABILITIES */}
        <section id="features" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Core Capabilities
            </h2>
            <p className="mt-2 text-slate-500 text-sm">
              Designed to help procurement and operations teams work faster and smarter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-16 sm:py-24 bg-slate-50/60 border-t border-slate-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Transparent Pricing
              </h2>
              <p className="mt-2 text-slate-500 text-sm">
                Simple, straightforward plans for teams of all sizes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between border ${
                    plan.popular
                      ? "border-indigo-600 shadow-md ring-1 ring-indigo-600"
                      : "border-slate-200 shadow-2xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                      {plan.popular && (
                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                        {plan.price}
                      </span>
                      {plan.available && plan.price !== "₹0" && (
                        <span className="text-xs text-slate-500">/ month</span>
                      )}
                    </div>

                    <p className="mt-2 text-xs sm:text-sm text-slate-500">
                      {plan.description}
                    </p>

                    <div className="my-6 border-t border-slate-100" />

                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-100">
                    {plan.available ? (
                      <Link
                        href="/register"
                        className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      >
                        <span>{plan.cta}</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 cursor-not-allowed select-none">
                        <span>Coming Soon</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="py-16 sm:py-20 text-center max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Streamline your quotation workflow
          </h2>
          <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
            Start comparing and analyzing supplier quotes in minutes with QuoteGenie.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">QG</span>
            </div>
            <span className="font-semibold text-slate-800">QuoteGenie</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/workspace" className="hover:text-slate-800 transition-colors">
              Workspace
            </Link>
            <Link href="/login" className="hover:text-slate-800 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-800 transition-colors">
              Register
            </Link>
          </div>

          <p>&copy; {new Date().getFullYear()} QuoteGenie. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}