"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loginOrganization,
  LoggedInOrganization,
  fetchCurrentProfile,
  logoutOrganization,
} from "../services/api";
import {
  MailIcon,
  LockIcon,
  CheckIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  BuildingIcon,
  ChartBarIcon,
} from "./Icons";

const PLANS_MAP: Record<number, { name: string; badge: string }> = {
  1: { name: "Starter", badge: "Free (5 Audits/mo)" },
  2: { name: "Professional", badge: "Pro (50 Audits/mo)" },
  3: { name: "Enterprise", badge: "Unlimited Audits" },
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggedInOrg, setLoggedInOrg] = useState<LoggedInOrganization | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

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
        router.replace("/dashboard");
        return;
      }

      try {
        const profile = await fetchCurrentProfile();
        if (profile && isMounted) {
          localStorage.setItem("quotegenie_user", JSON.stringify(profile));
          router.replace("/dashboard");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowForgotNotice(false);

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid work email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your account password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginOrganization({
        email: email.trim().toLowerCase(),
        password,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("quotegenie_user", JSON.stringify(response.data));
        if (response.data.token) {
          localStorage.setItem("quotegenie_token", response.data.token);
        }
      }

      setLoggedInOrg(response.data);
      router.push("/dashboard");
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

  const handleSignOut = async () => {
    await logoutOrganization();
    setLoggedInOrg(null);
    setPassword("");
    setErrorMessage(null);
  };

  // CHECKING ACTIVE SESSION VIEW
  if (isCheckingAuth) {
    return (
      <div className="w-full max-w-md mx-auto p-10 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 text-center relative overflow-hidden">
        <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-900">Checking Active Session</h3>
        <p className="text-xs text-slate-500 mt-1">
          You are already signed in. Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  // SUCCESS / LOGGED IN SESSION VIEW
  if (loggedInOrg) {
    const planInfo = PLANS_MAP[loggedInOrg.plan] || {
      name: `Plan ${loggedInOrg.plan}`,
      badge: "Active",
    };

    return (
      <div className="w-full max-w-lg mx-auto p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 text-slate-900 relative overflow-hidden">
        {/* Top ambient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckIcon className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Authenticated Session Active
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back!
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-sm mx-auto">
            You are signed in to{" "}
            <span className="text-slate-900 font-semibold">{loggedInOrg.companyName}</span>.
          </p>
        </div>

        {/* Account Details Box */}
        <div className="mt-8 rounded-2xl bg-slate-50 p-5 sm:p-6 border border-slate-200 space-y-3.5 text-sm relative z-10">
          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Organization</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <BuildingIcon className="w-4 h-4 text-slate-400" />
              <span>{loggedInOrg.companyName}</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Work Email</span>
            <span className="font-mono text-slate-800">{loggedInOrg.email}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Plan Tier</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {planInfo.name} ({planInfo.badge})
            </span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-500 font-medium">Security</span>
            <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bcrypt Verified &amp; Encrypted</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 relative z-10">
          <Link
            href="/#workbench"
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm text-center shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            <ChartBarIcon className="w-4 h-4" />
            <span>Open Quote Analyzer Workbench</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 font-semibold text-xs transition-all"
          >
            Sign Out / Switch Organization
          </button>
        </div>
      </div>
    );
  }

  // LOGIN FORM VIEW
  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-10 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 text-slate-900 relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-8 relative z-10">
        <span className="text-xs uppercase font-bold tracking-widest text-indigo-600">
          QuoteGenie Access
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Sign In to Your Account
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Enter your organization credentials to analyze quotes and benchmark rates.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 relative z-10">
          <span className="text-rose-600 font-black text-base leading-none mt-0.5">!</span>
          <div className="flex-1 text-xs sm:text-sm">{errorMessage}</div>
        </div>
      )}

      {/* Forgot Password Helper Notice */}
      {showForgotNotice && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5 relative z-10">
          <span className="text-indigo-600 font-bold">ℹ</span>
          <div className="flex-1">
            To reset your organization password, please contact your workspace administrator or email{" "}
            <span className="font-semibold underline">support@quotegenie.io</span>.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
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
            <button
              type="button"
              onClick={() => setShowForgotNotice(!showForgotNotice)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <LockIcon className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
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
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer accent-indigo-600"
          />
          <label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer select-none">
            Keep me signed in on this device
          </label>
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
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Organization</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Register */}
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-600">
          Don&apos;t have an organization account yet?{" "}
          <Link
            href="/register"
            className="text-indigo-600 font-bold hover:text-indigo-800 hover:underline"
          >
            Register here for free (5 Audits) →
          </Link>
        </p>
      </div>

      {/* Security badge at bottom of form */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
        <span>Secured with Bcrypt &amp; AES-256 Transport Encryption</span>
      </div>
    </div>
  );
}
