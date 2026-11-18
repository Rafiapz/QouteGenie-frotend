"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  registerOrganization,
  RegisteredOrganization,
  fetchCurrentProfile,
} from "../services/api";
import {
  BuildingIcon,
  MailIcon,
  LockIcon,
  CheckIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from "./Icons";

const PLANS = [
  {
    id: 1,
    name: "Starter",
    price: "₹0",
    description: "Full access to quotation analysis & sourcing",
    badge: "Free",
    available: true,
  },
  {
    id: 2,
    name: "Professional",
    price: "Coming Soon",
    description: "Multi-seat sourcing & team workflows",
    badge: "Upcoming",
    available: false,
  },
  {
    id: 3,
    name: "Enterprise",
    price: "Coming Soon",
    description: "Custom ERP sync & volume audits",
    badge: "Upcoming",
    available: false,
  },
];

export default function RegisterForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredOrg, setRegisteredOrg] = useState<RegisteredOrganization | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Check if user is already signed in
  const [isCheckingAuth, setIsCheckingAuth] = useState(() => {
    if (typeof window !== "undefined") {
      return Boolean(
        localStorage.getItem("quotegenie_user") || localStorage.getItem("quotegenie_token")
      );
    }
    return false;
  });

  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      const storedUser = localStorage.getItem("quotegenie_user");
      const storedToken = localStorage.getItem("quotegenie_token");

      if (storedUser || storedToken) {
        router.replace("/workspace");
        return;
      }

      try {
        const profile = await fetchCurrentProfile();
        if (profile && isMounted) {
          localStorage.setItem("quotegenie_user", JSON.stringify(profile));
          router.replace("/workspace");
          return;
        }
      } catch {
        // No active session
      }

      if (isMounted) {
        setIsCheckingAuth(false);
      }
    };

    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Password validation indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyName.trim()) {
      setErrorMessage("Please enter your organization or company name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid work email address.");
      return;
    }
    if (!hasMinLength) {
      setErrorMessage("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter the identical password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerOrganization({
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        password,
        plan: selectedPlan,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("quotegenie_user", JSON.stringify(response.data));
        if (response.data.token) {
          localStorage.setItem("quotegenie_token", response.data.token);
        }
      }

      setRegisteredOrg(response.data);
      router.push("/workspace");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!registeredOrg?.id) return;
    navigator.clipboard.writeText(registeredOrg.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleReset = () => {
    setRegisteredOrg(null);
    setCompanyName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedPlan(1);
    setErrorMessage(null);
  };

  // CHECKING ACTIVE SESSION VIEW
  if (isCheckingAuth) {
    return (
      <div className="w-full max-w-md mx-auto p-10 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 text-center relative overflow-hidden">
        <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-900">Checking Active Session</h3>
        <p className="text-xs text-slate-500 mt-1">
          You are already signed in. Redirecting to your workspace...
        </p>
      </div>
    );
  }

  // SUCCESS STATE VIEW
  if (registeredOrg) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 text-slate-900 relative overflow-hidden">
        <div className="text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckIcon className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Organization Ready!
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            <span className="text-slate-900 font-semibold">{registeredOrg.companyName}</span> has been successfully created in PostgreSQL with Bcrypt security.
          </p>
        </div>

        {/* Credentials & Details Card */}
        <div className="mt-8 rounded-2xl bg-slate-50 p-5 sm:p-6 border border-slate-200 space-y-3.5 text-sm relative z-10">
          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Company Name</span>
            <span className="font-semibold text-slate-900">{registeredOrg.companyName}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Account Email</span>
            <span className="font-mono text-slate-800">{registeredOrg.email}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Subscription Tier</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Plan {registeredOrg.plan} — {PLANS.find((p) => p.id === registeredOrg.plan)?.name}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Security</span>
            <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bcrypt Salted &amp; Hashed</span>
            </span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-500 font-medium">Organization ID</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-600 max-w-[140px] truncate" title={registeredOrg.id}>
                {registeredOrg.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-indigo-700 transition-colors"
              >
                {copiedId ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Next Steps */}
        <div className="mt-6 rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4 text-xs text-slate-600 space-y-1.5 relative z-10">
          <div className="font-semibold text-indigo-800 flex items-center gap-1.5 mb-1 text-sm">
            <span>Next steps to start analyzing quotes:</span>
          </div>
          <p>1. Upload your first vendor PDF proposal or SOW document</p>
          <p>2. Review automated line-item market rate benchmarks &amp; risk flags</p>
          <p>3. Generate data-backed counter-offer letters to recoup cost leakage</p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 relative z-10">
          <button
            onClick={handleReset}
            className="flex-1 py-3.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 bg-slate-50 text-slate-700 font-semibold text-sm transition-all"
          >
            Register Another
          </button>
          <Link
            href="/workspace"
            className="flex-1 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm text-center shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Enter Workspace</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // REGISTRATION FORM VIEW
  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 text-slate-900 relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6 relative z-10">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create an Account
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your organization details to get started.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 relative z-10">
          <span className="text-rose-600 font-black text-base leading-none mt-0.5">!</span>
          <div className="flex-1 text-xs sm:text-sm">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        {/* Company Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Company / Organization Name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <BuildingIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp / Global Sourcing LLC"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Work Email */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Work Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MailIcon className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@acme.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <span className="text-[11px] text-slate-500">Min. 8 characters</span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <LockIcon className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Password Strength Checklist */}
          {password.length > 0 && (
            <div className="mt-2.5 flex items-center gap-3 text-xs">
              <span className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                <CheckIcon className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-slate-300"}`} />
                8+ chars
              </span>
              <span className={`flex items-center gap-1 ${hasLetter ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                <CheckIcon className={`w-3.5 h-3.5 ${hasLetter ? "text-emerald-600" : "text-slate-300"}`} />
                Letter
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                <CheckIcon className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-slate-300"}`} />
                Number
              </span>
            </div>
          )}
        </div>

        {/* Re-enter / Confirm Password */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Re-enter Password
            </label>
            {confirmPassword.length > 0 && (
              <span
                className={`text-[11px] font-semibold flex items-center gap-1 ${
                  password === confirmPassword ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <LockIcon className="w-4 h-4" />
            </span>
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className={`w-full pl-10 pr-12 py-3 rounded-xl bg-white border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 text-sm transition-all shadow-2xs ${
                confirmPassword.length > 0 && password !== confirmPassword
                  ? "border-rose-300 focus:ring-rose-500 focus:border-rose-500"
                  : "border-slate-300 focus:ring-indigo-600 focus:border-indigo-600"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Plan Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Organization Plan Tier
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isAvailable = plan.available;
              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedPlan(plan.id);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-600 cursor-pointer"
                      : isAvailable
                      ? "border-slate-200 bg-slate-50/70 hover:border-slate-300 cursor-pointer"
                      : "border-slate-200 bg-slate-50/40 opacity-55 cursor-not-allowed select-none"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-slate-900">{plan.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : isAvailable
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-200/80 text-slate-500"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mb-0.5">
                    {plan.price}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {plan.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Creating Organization Account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
