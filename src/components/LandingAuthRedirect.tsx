"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentProfile } from "../services/api";

/**
 * Invisible client component mounted on the landing page ("/")
 * to detect logged-in users and redirect them directly to "/workspace".
 * Renders null so it does not alter server-rendered SEO HTML for guest visitors.
 */
export default function LandingAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 1. Fast path: check localStorage session or token
    const storedUser = localStorage.getItem("quotegenie_user");
    const storedToken = localStorage.getItem("quotegenie_token");

    if (storedUser || storedToken) {
      router.replace("/workspace");
      return;
    }

    // 2. Cookie check with backend
    fetchCurrentProfile().then((profile) => {
      if (profile) {
        localStorage.setItem("quotegenie_user", JSON.stringify(profile));
        router.replace("/workspace");
      }
    });
  }, [router]);

  return null;
}
