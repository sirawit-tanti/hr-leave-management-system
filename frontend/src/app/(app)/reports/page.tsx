"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDays, formatNumber } from "@/lib/format";
import { getAccessToken } from "@/lib/auth";
import type {
  LeaveBalanceItem,
  LeaveBalanceReportResponse,
  LeaveUsageItem,
  LeaveUsageReportResponse,
} from "@/types/reports";

type ReportFilters = {
  startDate: string;
  endDate: string;
};

export default function ReportsPage() {
  const defaultRange = useMemo(() => getCurrentYearRange(), []);

  const [filters, setFilters] = useState<ReportFilters>(defaultRange);
  const [usageReport, setUsageReport] =
    useState<LeaveUsageReportResponse | null>(null);
  const [balanceReport, setBalanceReport] =
    useState<LeaveBalanceReportResponse | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadReports(defaultRange);
  }, [defaultRange]);

  async function loadReports(nextFilters = filters) {
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const usageQuery = buildQueryString(nextFilters);

      const [usageResponse, balanceResponse] = await Promise.all([
        apiRequest<LeaveUsageReportResponse>(
          `/reports/leave-usage?${usageQuery}`,
        ),
        apiRequest<LeaveBalanceReportResponse>("/reports/leave-balances"),
      ]);

      setUsageReport(usageResponse);
      setBalanceReport(balanceResponse);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load reports",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadReports(filters);
  }

  function handleThisYear() {
    const currentYearRange = getCurrentYearRange();

    setFilters(currentYearRange);
    loadReports(currentYearRange);
  }

  async function exportLeaveUsageCsv() {
    setError("");
    setSuccessMessage("");
    setIsExporting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
      }

      const token = getAccessToken();
      const queryString = buildQueryString(filters);

      const response = await fetch(
        `${apiUrl}/reports/leave-usage/export?${queryString}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);

        throw new Error(
          errorBody?.message || `Export failed with status ${response.status}`,
        );
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "leave-usage-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage("CSV report has been exported successfully");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Analytics</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Reports</h1>
      </div>

      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Report Filters
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Date range applies to leave usage report and CSV export.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply Filter
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleThisYear}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            This Year
          </button>

          <button
            type="button"
            onClick={exportLeaveUsageCsv}
            disabled={isExporting}
            className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? "Exporting..." : "Export Leave Usage CSV"}
          </button>
        </div>
      </section>

      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-6 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-600">Loading reports...</p>
      ) : null}

      {!isLoading && usageReport && balanceReport ? (
        <div className="space-y-6">
          <UsageSummarySection usageReport={usageReport} />
          <UsageBreakdownSection usageReport={usageReport} />
          <UsageItemsSection items={usageReport.items} />

          <BalanceSummarySection balanceReport={balanceReport} />
          <BalanceItemsSection items={balanceReport.items} />
        </div>
      ) : null}
    </div>
  );
}

function UsageSummarySection({
  usageReport,
}: {
  usageReport: LeaveUsageReportResponse;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Leave Usage Summary
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Approved leave requests in selected date range.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          {formatDate(usageReport.range.startDate)} -{" "}
          {formatDate(usageReport.range.endDate)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          label="Total Approved Requests"
          value={usageReport.summary.totalRequests}
        />
        <SummaryCard
          label="Total Used Days"
          value={usageReport.summary.totalUsedDays}
          suffix="days"
        />
      </div>
    </section>
  );
}

function UsageBreakdownSection({
  usageReport,
}: {
  usageReport: LeaveUsageReportResponse;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Usage by Employee
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Total approved leave days grouped by employee.
          </p>
        </div>

        {usageReport.byEmployee.length === 0 ? (
          <EmptyState message="No employee usage found." />
        ) : (
          <div className="space-y-3">
            {usageReport.byEmployee.map((item) => (
              <div
                key={item.employeeProfileId}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.employeeName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.employeeCode} · {item.department}
                    </p>
                  </div>

                  <p className="font-bold text-slate-900">
                    {formatDays(item.totalUsedDays)}
                  </p>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {item.totalRequests} requests
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Usage by Leave Type
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Total approved leave days grouped by leave type.
          </p>
        </div>

        {usageReport.byLeaveType.length === 0 ? (
          <EmptyState message="No leave type usage found." />
        ) : (
          <div className="space-y-3">
            {usageReport.byLeaveType.map((item) => (
              <div
                key={item.leaveTypeId}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.leaveTypeName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.totalRequests} requests
                    </p>
                  </div>

                  <p className="font-bold text-slate-900">
                    {formatDays(item.totalUsedDays)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function UsageItemsSection({ items }: { items: LeaveUsageItem[] }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Leave Usage Details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Approved leave request records.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No approved leave requests found." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeader>Employee</TableHeader>
                  <TableHeader>Leave Type</TableHeader>
                  <TableHeader>Period</TableHeader>
                  <TableHeader>Total Days</TableHeader>
                  <TableHeader>Status</TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.employee.firstName} {item.employee.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.employee.employeeCode} ·{" "}
                          {item.employee.department}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{item.leaveType.name}</TableCell>
                    <TableCell>
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </TableCell>
                    <TableCell>{formatDays(item.totalDays)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function BalanceSummarySection({
  balanceReport,
}: {
  balanceReport: LeaveBalanceReportResponse;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Leave Balance Summary
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Current leave balance records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Total Rows"
          value={balanceReport.summary.totalRows}
        />
        <SummaryCard
          label="Total Days"
          value={balanceReport.summary.totalDays}
          suffix="days"
        />
        <SummaryCard
          label="Used Days"
          value={balanceReport.summary.usedDays}
          suffix="days"
        />
        <SummaryCard
          label="Remaining Days"
          value={balanceReport.summary.remainingDays}
          suffix="days"
        />
      </div>
    </section>
  );
}

function BalanceItemsSection({ items }: { items: LeaveBalanceItem[] }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Leave Balance Details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Leave entitlement grouped by employee and leave type.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState message="No leave balances found." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeader>Employee</TableHeader>
                  <TableHeader>Leave Type</TableHeader>
                  <TableHeader>Year</TableHeader>
                  <TableHeader>Total</TableHeader>
                  <TableHeader>Used</TableHeader>
                  <TableHeader>Remaining</TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.employee.firstName} {item.employee.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.employee.employeeCode} ·{" "}
                          {item.employee.department}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{item.leaveType.name}</TableCell>
                    <TableCell>{item.year}</TableCell>
                    <TableCell>{formatDays(item.totalDays)}</TableCell>
                    <TableCell>{formatDays(item.usedDays)}</TableCell>
                    <TableCell>{formatDays(item.remainingDays)}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatNumber(value)}
        {suffix ? <span className="text-base">{suffix}</span> : null}
      </p>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespcae-nowrap px-4 py-3 text-slate-700">{children}</td>
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

function buildQueryString(filters: ReportFilters) {
  const searchParams = new URLSearchParams();

  if (filters.startDate) {
    searchParams.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    searchParams.set("endDate", filters.endDate);
  }

  return searchParams.toString();
}

function getCurrentYearRange() {
  const now = new Date();

  return {
    startDate: `${now.getFullYear()}-01-01`,
    endDate: `${now.getFullYear()}-12-31`,
  };
}
