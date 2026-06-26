"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  formatDate,
  formatDays,
  formatLabel,
  formatNumber,
} from "@/lib/format";
import type {
  DashboardResponse,
  LeaveBalanceSummary,
  LeaveRequestSummary,
  LeaveUsageByType,
} from "@/types/dashboard";

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
        <div className="space-y-6">
          <StatsGrid summary={dashboard.summary} />

          {dashboard.role === "ADMIN" ? (
            <AdminDashboard dashboard={dashboard} />
          ) : null}

          {dashboard.role === "MANAGER" ? (
            <ManagerDashboard dashboard={dashboard} />
          ) : null}

          {dashboard.role === "EMPLOYEE" ? (
            <EmployeeDashboard dashboard={dashboard} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatsGrid({ summary }: { summary: Record<string, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(summary).map(([key, value]) => (
        <div
          key={key}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex min-h-[96px] flex-col justify-between">
            <p className="text-sm font-medium text-slate-500">
              {formatLabel(key)}
            </p>

            <p className="text-3xl font-bold leading-none text-slate-900">
              {formatNumber(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminDashboard({
  dashboard,
}: {
  dashboard: Extract<DashboardResponse, { role: "ADMIN" }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <LeaveUsageCard items={dashboard.leaveUsageByType} />
      <LeaveRequestList
        title="Recent Leave Requests"
        items={dashboard.recentLeaveRequests}
      />
    </div>
  );
}

function ManagerDashboard({
  dashboard,
}: {
  dashboard: Extract<DashboardResponse, { role: "MANAGER" }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <LeaveBalanceList
        title="My Leave Balances"
        items={dashboard.myLeaveBalances}
      />
      <LeaveRequestList
        title="Pending Approvals"
        items={dashboard.pendingApprovals}
      />
      <LeaveRequestList
        title="Recent Team Leave Requests"
        items={dashboard.recentTeamLeaveRequests}
      />
      <LeaveRequestList
        title="My Recent Leave Requests"
        items={dashboard.myRecentLeaveRequests}
      />
    </div>
  );
}

function EmployeeDashboard({
  dashboard,
}: {
  dashboard: Extract<DashboardResponse, { role: "EMPLOYEE" }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <LeaveBalanceList
        title="My Leave Balances"
        items={dashboard.myLeaveBalances}
      />
      <LeaveRequestList
        title="Recent Leave Requests"
        items={dashboard.recentLeaveRequests}
      />
    </div>
  );
}

function LeaveUsageCard({ items }: { items: LeaveUsageByType[] }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Leave Usage by Type
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Approved leave days in the current year
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No approved leave usage yet." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.leaveTypeId}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
            >
              <div>
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">Used days</p>
              </div>

              <p className="text-xl font-bold text-slate-900">
                {formatDays(item.usedDays)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LeaveBalanceList({
  title,
  items,
}: {
  title: string;
  items: LeaveBalanceSummary[];
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Current leave entitlement and remaining days
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No leave balances found." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.leaveType.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Year {item.year}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {item.leaveType.isPaid ? "Paid" : "Unpaid"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <BalanceMiniStat label="Total" value={item.totalDays} />
                <BalanceMiniStat label="Used" value={item.usedDays} />
                <BalanceMiniStat label="Remaining" value={item.remainingDays} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BalanceMiniStat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{formatDays(value)}</p>
    </div>
  );
}

function LeaveRequestList({
  title,
  items,
}: {
  title: string;
  items: LeaveRequestSummary[];
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest leave request activities
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No leave requests found." />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const employeeName = `${item.employeeProfile.firstName} ${item.employeeProfile.lastName}`;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{employeeName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.employeeProfile.employeeCode} ·{" "}
                      {item.employeeProfile.department}
                    </p>
                  </div>

                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-900">
                    {item.leaveType.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(item.startDate)} - {formatDate(item.endDate)} ·{" "}
                    {formatDays(item.totalDays)}
                  </p>
                </div>

                {item.reason ? (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {item.reason}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classNameByStatus: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
    CANCELLED: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold",
        classNameByStatus[status] ?? "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
