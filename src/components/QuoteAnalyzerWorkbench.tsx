"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  SparklesIcon,
  CheckIcon,
  AlertTriangleIcon,
  TrendingDownIcon,
  ChartBarIcon,
  ScaleIcon,
  CopyIcon,
  ArrowRightIcon,
  UploadCloudIcon,
  DocumentTextIcon,
  BuildingIcon,
} from "./Icons";
import { formatNumber } from "../utils/format";

interface QuoteItem {
  id: string;
  name: string;
  category: string;
  quotedRate: number;
  benchmarkRate: number;
  unit: string;
  quantity: number;
  variancePercent: number;
  riskLevel: "high" | "medium" | "fair" | "competitive";
  rationale: string;
}

interface ContractRisk {
  id: string;
  title: string;
  severity: "critical" | "warning" | "advisory";
  category: string;
  clauseExcerpt: string;
  issueExplanation: string;
  recommendedCounterClause: string;
}

interface ProposalScenario {
  id: string;
  title: string;
  vendorName: string;
  vendorCategory: string;
  totalQuoted: number;
  potentialSavings: number;
  savingsPercentage: number;
  healthScore: number;
  riskRating: "Low" | "Moderate" | "High";
  items: QuoteItem[];
  risks: ContractRisk[];
  competitor: {
    vendorName: string;
    totalPrice: number;
    scopeMatch: number;
    warranty: string;
    verdict: string;
  };
}

const PRESET_PROPOSALS: ProposalScenario[] = [
  {
    id: "cloud-devops",
    title: "AWS Cloud Migration & DevOps Retainer",
    vendorName: "CloudTech Solutions LLC",
    vendorCategory: "IT & Cloud Infrastructure",
    totalQuoted: 84500,
    potentialSavings: 18400,
    savingsPercentage: 21.8,
    healthScore: 68,
    riskRating: "Moderate",
    items: [
      {
        id: "c-1",
        name: "Principal Cloud Architect",
        category: "Professional Services",
        quotedRate: 215,
        benchmarkRate: 165,
        unit: "hr",
        quantity: 120,
        variancePercent: 30.3,
        riskLevel: "high",
        rationale: "Quoted rate is 30% above the 75th percentile for cloud architects (₹165/hr).",
      },
      {
        id: "c-2",
        name: "Terraform Infrastructure as Code Pipeline",
        category: "Fixed Milestone",
        quotedRate: 19500,
        benchmarkRate: 14000,
        unit: "milestone",
        quantity: 1,
        variancePercent: 39.3,
        riskLevel: "high",
        rationale: "Comparable AWS IaC automation deliveries average ₹13,500 - ₹14,500 across 3,400 audits.",
      },
      {
        id: "c-3",
        name: "Kubernetes (EKS) Cluster Setup & Hardening",
        category: "Implementation",
        quotedRate: 16000,
        benchmarkRate: 15200,
        unit: "project",
        quantity: 1,
        variancePercent: 5.3,
        riskLevel: "fair",
        rationale: "Within reasonable market tolerance (5% delta). Acceptable scope definition.",
      },
      {
        id: "c-4",
        name: "Senior Site Reliability Engineer (Monthly Retainer)",
        category: "Recurring Ops",
        quotedRate: 145,
        benchmarkRate: 110,
        unit: "hr",
        quantity: 160,
        variancePercent: 31.8,
        riskLevel: "high",
        rationale: "Recurring hourly rates should qualify for a 20% volume retainer discount.",
      },
      {
        id: "c-5",
        name: "Data Ingestion & VPC Peering Setup",
        category: "Networking",
        quotedRate: 5800,
        benchmarkRate: 6200,
        unit: "fixed",
        quantity: 1,
        variancePercent: -6.5,
        riskLevel: "competitive",
        rationale: "Competitive pricing. Priced 6.5% under industry median for multi-region VPC.",
      },
    ],
    risks: [
      {
        id: "r-1",
        title: "Uncapped Out-of-Scope Billing Clause",
        severity: "critical",
        category: "Change Management",
        clauseExcerpt: "Section 7.3: 'Any task exceeding original sprint estimate will bill at 1.5x standard rate without prior written sign-off.'",
        issueExplanation: "Exposes your organization to open-ended budget overrun with no mandatory pre-approval threshold.",
        recommendedCounterClause: "All scope additions must require a formal Change Order signed by Client VP before work commences. Rates remain fixed at agreed rate card.",
      },
      {
        id: "r-2",
        title: "Missing Uptime & Recovery SLA Guarantees",
        severity: "warning",
        category: "Service Level Agreement",
        clauseExcerpt: "Section 12.1: 'Provider will make commercially reasonable efforts to ensure infrastructure availability.'",
        issueExplanation: "No financial penalty or service credit remedy if vendor configuration causes downtime.",
        recommendedCounterClause: "Include standard 99.9% uptime SLA with tiered 10%-25% monthly billing credits for breaches.",
      },
      {
        id: "r-3",
        title: "Asymmetric IP Rights Assignment",
        severity: "advisory",
        category: "Intellectual Property",
        clauseExcerpt: "Section 15.2: 'Custom scripts remain proprietary vendor tooling licensed to Client on non-exclusive basis.'",
        issueExplanation: "You should own all custom Terraform IaC scripts developed specifically for your tenant.",
        recommendedCounterClause: "All custom scripts and configuration files shall be deemed Work for Hire and become sole property of Client upon payment.",
      },
    ],
    competitor: {
      vendorName: "NexaScale Systems",
      totalPrice: 69800,
      scopeMatch: 98,
      warranty: "90 days post-launch",
      verdict: "NexaScale provides identical AWS architecture coverage at 17.4% lower cost with 90-day warranty vs 30 days.",
    },
  },
  {
    id: "app-dev",
    title: "Mobile iOS & Android App SOW",
    vendorName: "Vanguard Digital Agency",
    vendorCategory: "Software Engineering",
    totalQuoted: 128000,
    potentialSavings: 29500,
    savingsPercentage: 23.0,
    healthScore: 54,
    riskRating: "High",
    items: [
      {
        id: "a-1",
        name: "React Native Senior Lead Developer",
        category: "Engineering",
        quotedRate: 155,
        benchmarkRate: 115,
        unit: "hr",
        quantity: 320,
        variancePercent: 34.8,
        riskLevel: "high",
        rationale: "Quoted ₹155/hr is in the 92nd percentile for cross-platform app developers.",
      },
      {
        id: "a-2",
        name: "UX/UI Design System & Prototyping",
        category: "Design",
        quotedRate: 18500,
        benchmarkRate: 13200,
        unit: "fixed",
        quantity: 1,
        variancePercent: 40.1,
        riskLevel: "high",
        rationale: "Agency markups on design systems average 40% higher than specialized design studios.",
      },
      {
        id: "a-3",
        name: "QA Automation & Device Matrix Testing",
        category: "Quality Assurance",
        quotedRate: 14000,
        benchmarkRate: 9800,
        unit: "fixed",
        quantity: 1,
        variancePercent: 42.8,
        riskLevel: "high",
        rationale: "Includes redundant manual testing fees that can be streamlined via automated test harness.",
      },
      {
        id: "a-4",
        name: "Backend REST & GraphQL Integration",
        category: "API Development",
        quotedRate: 24000,
        benchmarkRate: 23000,
        unit: "fixed",
        quantity: 1,
        variancePercent: 4.3,
        riskLevel: "fair",
        rationale: "Priced within 4% of market median for secure OAuth & payment gateway hookups.",
      },
    ],
    risks: [
      {
        id: "ar-1",
        title: "Front-Heavy Payment Milestone Trap",
        severity: "critical",
        category: "Financial Terms",
        clauseExcerpt: "Schedule B: '60% due upon project kick-off, 30% after prototype, 10% upon app store submission.'",
        issueExplanation: "90% of funds disbursed before you have functional software on your test devices.",
        recommendedCounterClause: "Restructure to balanced 20% kickoff / 25% alpha build / 25% beta build / 20% app store approval / 10% 30-day retention.",
      },
      {
        id: "ar-2",
        title: "Warranty Period Restricted to 14 Days",
        severity: "warning",
        category: "Warranty & Defects",
        clauseExcerpt: "Section 9.4: 'Bug fixes reported after 14 calendar days from delivery will be billed as new change orders.'",
        issueExplanation: "14 days is insufficient to detect production edge cases and regression bugs in real-world users.",
        recommendedCounterClause: "Extend defect liability warranty to minimum 60 days for all Severity 1 and Severity 2 defects.",
      },
    ],
    competitor: {
      vendorName: "PulseMobile Studio",
      totalPrice: 104000,
      scopeMatch: 95,
      warranty: "60 days post-launch",
      verdict: "PulseMobile offers a balanced payment schedule and lower blended rate card (₹118/hr vs ₹155/hr).",
    },
  },
  {
    id: "logistics-3pl",
    title: "Enterprise Warehousing & 3PL Logistics",
    vendorName: "Apex Global Freight",
    vendorCategory: "Logistics & Supply Chain",
    totalQuoted: 210000,
    potentialSavings: 34200,
    savingsPercentage: 16.3,
    healthScore: 82,
    riskRating: "Low",
    items: [
      {
        id: "l-1",
        name: "Dedicated Pallet Storage (Per Position/Mo)",
        category: "Warehousing",
        quotedRate: 24.5,
        benchmarkRate: 19.8,
        unit: "pallet/mo",
        quantity: 4800,
        variancePercent: 23.7,
        riskLevel: "high",
        rationale: "Class-A warehouse average in current region is ₹19.80 for commitments above 3,000 pallets.",
      },
      {
        id: "l-2",
        name: "B2C Pick & Pack (First Item)",
        category: "Fulfillment",
        quotedRate: 3.1,
        benchmarkRate: 2.95,
        unit: "order",
        quantity: 24000,
        variancePercent: 5.1,
        riskLevel: "fair",
        rationale: "Competitive fulfillment rate with barcoded scan verification included.",
      },
      {
        id: "l-3",
        name: "Inbound Container De-stuffing & Palletizing",
        category: "Receiving",
        quotedRate: 420,
        benchmarkRate: 450,
        unit: "40ft HQ",
        quantity: 36,
        variancePercent: -6.7,
        riskLevel: "competitive",
        rationale: "Discounted 6.7% below prevailing port-adjacent drayage rates.",
      },
    ],
    risks: [
      {
        id: "lr-1",
        title: "Uncapped Fuel Surcharge Escalator",
        severity: "warning",
        category: "Price Indexation",
        clauseExcerpt: "Addendum 3: 'Fuel surcharges adjust bi-weekly according to vendor proprietary internal indices.'",
        issueExplanation: "Allows vendor to unilaterally apply arbitrary surcharge adjustments without public index pegging.",
        recommendedCounterClause: "Peg fuel surcharges directly to the public US Energy Information Administration (EIA) index with a ±5% deadband.",
      },
    ],
    competitor: {
      vendorName: "OmniLogistics Hub",
      totalPrice: 182000,
      scopeMatch: 92,
      warranty: "99.8% pick accuracy SLA",
      verdict: "OmniLogistics offers lower pallet storage rates with an established public fuel indexing peg.",
    },
  },
];

type ActiveTab = "benchmark" | "risks" | "comparison" | "counterOffer";

export default function QuoteAnalyzerWorkbench() {
  const [selectedScenario, setSelectedScenario] = useState<ProposalScenario>(
    PRESET_PROPOSALS[0]
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("benchmark");
  const [filterOverpriced, setFilterOverpriced] = useState<boolean>(false);
  const [negotiationTone, setNegotiationTone] = useState<"balanced" | "assertive">(
    "balanced"
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [simulatedUploading, setSimulatedUploading] = useState<boolean>(false);

  // Filter items
  const displayedItems = filterOverpriced
    ? selectedScenario.items.filter((item) => item.variancePercent > 15)
    : selectedScenario.items;

  // Counter-offer letter generation
  const highRiskItems = selectedScenario.items.filter((i) => i.riskLevel === "high");
  const formattedTotal = `₹${formatNumber(selectedScenario.totalQuoted)}`;
  const formattedSavings = `₹${formatNumber(selectedScenario.potentialSavings)}`;
  const targetCounterPrice = `₹${formatNumber(
    selectedScenario.totalQuoted - selectedScenario.potentialSavings
  )}`;

  const counterOfferLetter =
    negotiationTone === "balanced"
      ? `Subject: Proposal Feedback & Commercial Adjustment: ${selectedScenario.title}

Dear ${selectedScenario.vendorName} Commercial Team,

Thank you for submitting your proposal for "${selectedScenario.title}". We appreciate the thorough breakdown and your team's technical qualifications.

After conducting a commercial market analysis across our procurement benchmark database, we have identified several line items that deviate noticeably from current median market rates:

${highRiskItems
  .map(
    (i) =>
      `• ${i.name}: Currently quoted at ₹${i.quotedRate}/${i.unit}. Our independent benchmark median is ₹${i.benchmarkRate}/${i.unit} (a +${i.variancePercent.toFixed(1)}% variance). Target rate: ₹${i.benchmarkRate}/${i.unit}.`
  )
  .join("\n")}

Furthermore, our legal and compliance audit highlighted the following contractual considerations:
• ${selectedScenario.risks[0]?.title}: ${selectedScenario.risks[0]?.recommendedCounterClause}

In order to proceed to contract award, we propose adjusting the commercial sum from ${formattedTotal} to ${targetCounterPrice} (reflecting ${formattedSavings} in target benchmark savings, or -${selectedScenario.savingsPercentage}%) and aligning the terms as noted above.

Please let us know if your commercial team can confirm this adjustment by Friday so we can finalize the agreement.

Sincerely,
Procurement & Vendor Management Team`
      : `Subject: Formal RFP Review & Best-and-Final-Offer Request: ${selectedScenario.title}

Attention: ${selectedScenario.vendorName} Sales Leadership,

We have completed our institutional pricing analysis for the "${selectedScenario.title}" proposal submitted to our company.

Our procurement intelligence engine benchmarks vendor rates across 1.2M+ verified transaction points. The current proposal contains an aggregate +${selectedScenario.savingsPercentage}% premium over industry median:

1. RATE DISCREPANCIES:
${highRiskItems
  .map(
    (i) =>
      `- ${i.name}: Quoted ₹${i.quotedRate}/${i.unit} vs Industry Median ₹${i.benchmarkRate}/${i.unit} (+${i.variancePercent.toFixed(1)}% premium).`
  )
  .join("\n")}

2. NON-STANDARD RISK TERMS:
- Clause Flag: ${selectedScenario.risks[0]?.clauseExcerpt}
- Required Revision: ${selectedScenario.risks[0]?.recommendedCounterClause}

3. FINAL CONTRACT THRESHOLD:
To qualify for final award against competing bids currently under evaluation, your revised BAFO (Best and Final Offer) must not exceed ${targetCounterPrice}.

Please submit your revised SOW within 3 business days to maintain active consideration.

Regards,
Strategic Sourcing Directorate`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(counterOfferLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateUpload = () => {
    setSimulatedUploading(true);
    setTimeout(() => {
      setSimulatedUploading(false);
      const nextIdx =
        (PRESET_PROPOSALS.findIndex((p) => p.id === selectedScenario.id) + 1) %
        PRESET_PROPOSALS.length;
      setSelectedScenario(PRESET_PROPOSALS[nextIdx]);
    }, 1000);
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl shadow-slate-200/60 relative overflow-hidden text-slate-900">
      {/* Subtle top ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls: Scenario Selector & Live Badge */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Live Quote Analyser Engine v2.4
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              • Benchmarking against 1.2M+ supplier rate cards
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Audit Workbench</span>
            <span className="text-slate-400 font-normal text-sm sm:text-base">
              / {selectedScenario.vendorName}
            </span>
          </h3>
        </div>

        {/* Preset Selector Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <span className="text-xs text-slate-500 font-medium mr-1 hidden xl:inline">
            Load Sample Proposal:
          </span>
          {PRESET_PROPOSALS.map((scenario) => {
            const isSelected = scenario.id === selectedScenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-102"
                    : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/80"
                }`}
              >
                <span>{scenario.title.split(" ")[0]}</span>
                <span className="text-[10px] opacity-80 font-mono">
                  (${Math.round(scenario.totalQuoted / 1000)}k)
                </span>
              </button>
            );
          })}

          <button
            onClick={handleSimulateUpload}
            disabled={simulatedUploading}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-dashed border-indigo-300 transition-all flex items-center gap-1.5"
            title="Simulate analyzing your own PDF quote"
          >
            <UploadCloudIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>{simulatedUploading ? "Parsing..." : "Upload Quote"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
        {/* Total Proposal Cost */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Quoted Total</span>
            <BuildingIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 font-mono">
              ₹{formatNumber(selectedScenario.totalQuoted)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {selectedScenario.vendorCategory}
            </p>
          </div>
        </div>

        {/* Potential Identified Savings */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Potential Savings</span>
            <TrendingDownIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-700 font-mono">
              ₹{formatNumber(selectedScenario.potentialSavings)}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                -{selectedScenario.savingsPercentage}%
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">Recoupable</span>
            </div>
          </div>
        </div>

        {/* Quote Health Score */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Quote Health Score</span>
            <ChartBarIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl sm:text-2xl lg:text-3xl font-black font-mono ${
                  selectedScenario.healthScore > 75
                    ? "text-emerald-700"
                    : selectedScenario.healthScore > 60
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {selectedScenario.healthScore}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto ${
                  selectedScenario.healthScore > 75
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : selectedScenario.healthScore > 60
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                {selectedScenario.riskRating} Risk
              </span>
            </div>
            {/* Visual health bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  selectedScenario.healthScore > 75
                    ? "bg-emerald-600"
                    : selectedScenario.healthScore > 60
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${selectedScenario.healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contractual Flags Detected */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Contract Red Flags</span>
            <AlertTriangleIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-700 font-mono">
              {selectedScenario.risks.length} Detected
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {highRiskItems.length} line items overcharged
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("benchmark")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "benchmark"
              ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ChartBarIcon className="w-4 h-4 text-indigo-600" />
          <span>Price Benchmark Audit</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
            {selectedScenario.items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("risks")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "risks"
              ? "bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
          <span>Hidden Risk &amp; Clause Radar</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
            {selectedScenario.risks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "comparison"
              ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ScaleIcon className="w-4 h-4 text-indigo-600" />
          <span>Vendor Side-by-Side</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
            Winner
          </span>
        </button>

        <button
          onClick={() => setActiveTab("counterOffer")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === "counterOffer"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <SparklesIcon className="w-4 h-4 text-emerald-600" />
          <span>AI Counter-Offer Drafter</span>
        </button>
      </div>

      {/* Tab Content Display Area */}
      <div className="mt-6">
        {/* TAB 1: PRICE BENCHMARKS */}
        {activeTab === "benchmark" && (
          <div className="space-y-4">
            {/* Filter Toggle */}
            <div className="flex items-center justify-between text-xs text-slate-600 pb-2">
              <span className="font-medium">
                Detailed Rate Card Variance vs Industry P50 Median:
              </span>
              <button
                onClick={() => setFilterOverpriced(!filterOverpriced)}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs font-semibold ${
                  filterOverpriced
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {filterOverpriced
                  ? "Showing Overpriced Only (Click to show all)"
                  : "Filter: Show Overpriced (>15%) Only"}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Line Item / Deliverable</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Quoted Rate</th>
                    <th className="py-3 px-4 text-right">Market Median</th>
                    <th className="py-3 px-4 text-center">Variance</th>
                    <th className="py-3 px-4 text-right">Target Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedItems.map((item) => {
                    const isOver = item.variancePercent > 15;
                    const isFair = item.variancePercent >= 0 && item.variancePercent <= 15;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 group-hover:text-slate-600">
                            {item.rationale}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                          {item.category}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹{formatNumber(item.quotedRate)}/{item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                          ₹{formatNumber(item.benchmarkRate)}/{item.unit}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                              isOver
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : isFair
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {item.variancePercent > 0 ? `+` : ``}
                            {item.variancePercent.toFixed(1)}%
                            {isOver && " ⚠️"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          ₹{formatNumber(item.benchmarkRate)}/{item.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom summary banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Benchmarking Recommendation
                  </h4>
                  <p className="text-xs text-slate-600">
                    Apply target rates to recover{" "}
                    <span className="text-emerald-700 font-bold">
                      ₹{formatNumber(selectedScenario.potentialSavings)}
                    </span>{" "}
                    without reducing scope or deliverables.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("counterOffer")}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <span>Draft Counter-Offer</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: RISKS & CLAUSES */}
        {activeTab === "risks" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              QuoteGenie scanned 18 standard contractual risk heuristics across this SOW.
              The following clauses require immediate adjustment before signature:
            </p>

            <div className="grid grid-cols-1 gap-4">
              {selectedScenario.risks.map((risk) => (
                <div
                  key={risk.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          risk.severity === "critical"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : risk.severity === "warning"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {risk.severity} Risk
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {risk.title}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      Category: {risk.category}
                    </span>
                  </div>

                  {/* Quoted Excerpt */}
                  <div className="bg-rose-50/60 border-l-4 border-rose-500 p-3 rounded-r-xl text-xs text-rose-950 italic mb-3 font-mono">
                    {risk.clauseExcerpt}
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-700 mb-3 leading-relaxed">
                    <strong className="text-slate-900">Why this is dangerous: </strong>
                    {risk.issueExplanation}
                  </p>

                  {/* Recommendation */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="text-xs text-emerald-950">
                      <span className="font-bold text-emerald-800">
                        Counter-Clause Language:{" "}
                      </span>
                      <span>&quot;{risk.recommendedCounterClause}&quot;</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(risk.recommendedCounterClause);
                      }}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 border border-emerald-200"
                    >
                      <CopyIcon className="w-3 h-3" />
                      <span>Copy Clause</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: VENDOR COMPARISON */}
        {activeTab === "comparison" && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900">
              💡 <strong>Multi-Bid Equalization:</strong> Our engine normalized the scope
              of both proposals to ensure direct apples-to-apples comparison.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Vendor */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Current Proposal
                    </span>
                    <h4 className="text-base font-bold text-slate-900">
                      {selectedScenario.vendorName}
                    </h4>
                  </div>
                  <span className="text-xl font-black font-mono text-slate-900">
                    ₹{formatNumber(selectedScenario.totalQuoted)}
                  </span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-200">
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Health / Compliance Score</span>
                    <span className="font-bold font-mono">
                      {selectedScenario.healthScore} / 100
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Risk Flags Detected</span>
                    <span className="font-bold text-rose-600">
                      {selectedScenario.risks.length} Unfavorable Clauses
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Warranty / Guarantee</span>
                    <span className="font-bold">Standard 30 Days</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Price vs Market Median</span>
                    <span className="font-bold text-rose-600">
                      +{selectedScenario.savingsPercentage}% Premium
                    </span>
                  </div>
                </div>
              </div>

              {/* Competing Vendor */}
              <div className="bg-emerald-50/50 border-2 border-emerald-500 rounded-2xl p-5 space-y-4 relative shadow-sm">
                <div className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                  ★ Recommended Value Winner
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                      Market Alternative Bid
                    </span>
                    <h4 className="text-base font-bold text-slate-900">
                      {selectedScenario.competitor.vendorName}
                    </h4>
                  </div>
                  <span className="text-xl font-black font-mono text-emerald-700">
                    ₹{formatNumber(selectedScenario.competitor.totalPrice)}
                  </span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-emerald-200">
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Scope Match Index</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {selectedScenario.competitor.scopeMatch}% Match
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Warranty Coverage</span>
                    <span className="font-bold text-slate-900">
                      {selectedScenario.competitor.warranty}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Total Net Cost Savings</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      ₹
                      {formatNumber(
                        selectedScenario.totalQuoted -
                        selectedScenario.competitor.totalPrice
                      )}{" "}
                      Cheaper
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span className="text-slate-500">Verdict</span>
                    <span className="font-semibold text-emerald-800">Superior Value</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-emerald-200 leading-relaxed shadow-2xs">
                  {selectedScenario.competitor.verdict}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COUNTER-OFFER DRAFTER */}
        {activeTab === "counterOffer" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Automated Counter-Offer Generator
                </h4>
                <p className="text-xs text-slate-500">
                  Pre-drafted executive email citing exact rate benchmarks and clause revisions.
                </p>
              </div>

              {/* Tone Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setNegotiationTone("balanced")}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                    negotiationTone === "balanced"
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Balanced Partner
                </button>
                <button
                  onClick={() => setNegotiationTone("assertive")}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                    negotiationTone === "assertive"
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Assertive BAFO
                </button>
              </div>
            </div>

            {/* Email Container */}
            <div className="relative">
              <textarea
                readOnly
                rows={12}
                value={counterOfferLetter}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm font-mono text-slate-800 leading-relaxed focus:outline-none resize-none selection:bg-indigo-500 selection:text-white shadow-inner"
              />

              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Expected result: 78% of vendors adjust pricing within 10-18% when presented with
                benchmarked rate data.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Conversion Bar */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Want to analyze your company&apos;s active vendor proposals?
            </h4>
            <p className="text-xs text-slate-500">
              Create an organization account and get 5 free deep quote audits.
            </p>
          </div>
        </div>

        <Link
          href="/register"
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all text-center flex items-center justify-center gap-2"
        >
          <span>Start Analyzing Free</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
