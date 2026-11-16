import { redirect } from "next/navigation";

/**
 * Backward compatibility redirect from legacy /dashboard to /workspace.
 */
export default function LegacyDashboardRedirect() {
  redirect("/workspace");
}
