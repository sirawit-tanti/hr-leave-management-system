"use client";

import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

type AppHeaderProps = {
  user: AuthUser;
  onOpenSidebar: () => void;
};

export function AppHeader({ user, onOpenSidebar }: AppHeaderProps) {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
            aria-label="Open menu"
          >
            Menu
          </button>

          <div className="min-w-0">
            <p className="text-sm text-slate-500">Signed in as</p>
            <h2 className="truncate text-sm font-semibold text-slate-900">
              {user.email}
            </h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:inline-flex">
            {user.role}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
