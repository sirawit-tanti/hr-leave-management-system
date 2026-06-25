"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { clearAuth, getAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

type DashboardResponse = {
  role: string;
  summary: Record<string, number>;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const authUser = getAuthUser();

      if (!authUser) {
        router.replace("/login");
        return;
      }

      setUser(authUser);

      try {
        const response = await apiRequest<DashboardResponse>("/dashboard");
        setDashboard(response);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load dashboard",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              HR Leave Management
            </p>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {user ? (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Signed in as</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {user.email}
            </h2>
            <p className="mt-1 text-sm text-slate-600">Role: {user.role}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {dashboard ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm text-slate-500">Backend response</p>
              <h2 className="text-lg font-semibold text-slate-900">
                {dashboard.role} Dashboard
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(dashboard.summary).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="text-sm text-slate-500">{key}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
