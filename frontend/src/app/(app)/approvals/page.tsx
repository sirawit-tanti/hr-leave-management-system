"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDays } from "@/lib/format";
import type { LeaveRequest } from "@/types/leave";

export default function ApprovalsPage() {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  async function loadPendingApprovals() {
    setError("");
    setIsLoading(true);

    try {
      const response = await apiRequest<LeaveRequest[]>("/approvals/pending");
      setPendingRequests(response);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load pending approvals",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function approveRequest(leaveRequest: LeaveRequest) {
    const comment = window.prompt("Approval comment (optional)");

    if (comment === null) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setProcessingRequestId(leaveRequest.id);

    try {
      await apiRequest<LeaveRequest>(`/approvals/${leaveRequest.id}/approve`, {
        method: "PATCH",
        body: {
          comment: comment.trim() || undefined,
        },
      });

      setSuccessMessage("Leave request has been approved successfully.");
      await loadPendingApprovals();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to approve request",
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function rejectRequest(leaveRequest: LeaveRequest) {
    const comment = window.prompt("Reject reason");

    if (comment === null) {
      return;
    }

    if (comment.trim().length < 2) {
      setError("Reject reason must be at least 2 characters.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setProcessingRequestId(leaveRequest.id);

    try {
      await apiRequest<LeaveRequest>(`/approvals/${leaveRequest.id}/reject`, {
        method: "PATCH",
        body: {
          comment: comment.trim(),
        },
      });

      setSuccessMessage("Leave request has been rejected successfully.");
      await loadPendingApprovals();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to reject request",
      );
    } finally {
      setProcessingRequestId(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading approvals...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Manager</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Approvals</h1>
      </div>

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

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Pending Leave Requests
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review leave requests waiting for approval.
          </p>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-500">
              No pending approvals found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((leaveRequest) => {
              const employeeName = `${leaveRequest.employeeProfile.firstName} ${leaveRequest.employeeProfile.lastName}`;
              const isProcessing = processingRequestId === leaveRequest.id;

              return (
                <article
                  key={leaveRequest.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {employeeName}
                        </h3>
                        <StatusBadge status={leaveRequest.status} />
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {leaveRequest.employeeProfile.employeeCode} ·{" "}
                        {leaveRequest.employeeProfile.department} ·{" "}
                        {leaveRequest.employeeProfile.position}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => approveRequest(leaveRequest)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing ? "Processing..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => rejectRequest(leaveRequest)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <InfoBox
                      label="Leave Type"
                      value={leaveRequest.leaveType.name}
                    />
                    <InfoBox
                      label="Period"
                      value={`${formatDate(leaveRequest.startDate)} - ${formatDate(
                        leaveRequest.endDate,
                      )}`}
                    />
                    <InfoBox
                      label="Total Days"
                      value={formatDays(leaveRequest.totalDays)}
                    />
                  </div>

                  {leaveRequest.reason ? (
                    <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs font-medium text-slate-500">
                        Reason
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {leaveRequest.reason}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semebold text-slate-900">{value}</p>
    </div>
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
