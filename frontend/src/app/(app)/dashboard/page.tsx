"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type DashboardResponse = {
  role: string;
  summary: Record<string, number>;
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
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
  }, []);

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading dashboard...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Overview</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Dashboard</h1>
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {dashboard ? (
        <div>
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Dashboard role</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {dashboard.role}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(dashboard.summary).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">{key}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
