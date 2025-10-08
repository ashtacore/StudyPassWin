"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 rounded bg-white dark:bg-gray-700 text-secondary dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-secondary-hover dark:hover:text-white transition-colors shadow-sm hover:shadow"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
