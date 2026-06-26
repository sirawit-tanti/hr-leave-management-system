"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDays } from "@/lib/format";
import { getAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";
import type {
  LeaveRequest,
  LeaveRequestFormValues,
  LeaveType,
} from "@/types/leave";

const initialFormValues: LeaveRequestFormValues = {
  leaveTypeId: "",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function LeaveRequestsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [formValues, setFormValues] =
    useState<LeaveRequestFormValues>(initialFormValues);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLeaveTypes = useMemo(() => {
    return leaveTypes.filter((leaveType) => leaveType.isActive);
  }, [leaveTypes]);

  useEffect(() => {
    const authUser = getAuthUser();
    setUser(authUser);

    loadInitialData();
  }, []);

  async function loadInitialData() {
    setError("");
    setIsLoading(true);

    try {
      const [leaveRequestResponse, leaveTypeResponse] = await Promise.all([
        apiRequest<LeaveRequest[]>("/leave-requests"),
        apiRequest<LeaveType[]>("/leave-types"),
      ]);

      setLeaveRequests(leaveRequestResponse);
      setLeaveTypes(leaveTypeResponse);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load leave requests",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(field: keyof LeaveRequestFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (editingRequestId) {
        await apiRequest<LeaveRequest>(`/leave-requests/${editingRequestId}`, {
          method: "PATCH",
          body: {
            leaveTypeId: formValues.leaveTypeId,
            startDate: formValues.startDate,
            endDate: formValues.endDate,
            reason: formValues.reason || undefined,
          },
        });

        setSuccessMessage("Leave request has been updated successfully.");
      } else {
        await apiRequest<LeaveRequest>("/leave-requests", {
          method: "POST",
          body: {
            leaveTypeId: formValues.leaveTypeId,
            startDate: formValues.startDate,
            endDate: formValues.endDate,
            reason: formValues.reason || undefined,
          },
        });

        setSuccessMessage("Leave request has been created successfully.");
      }

      resetForm();
      await loadInitialData();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save leave request",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(leaveRequest: LeaveRequest) {
    setEditingRequestId(leaveRequest.id);
    setSuccessMessage("");
    setError("");

    setFormValues({
      leaveTypeId: leaveRequest.leaveType.id,
      startDate: toDateInputValue(leaveRequest.startDate),
      endDate: toDateInputValue(leaveRequest.endDate),
      reason: leaveRequest.reason ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function cancelLeaveRequest(leaveRequest: LeaveRequest) {
    const comment = window.prompt("Cancellation comment");

    if (comment === null) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await apiRequest<LeaveRequest>(
        `/leave-requests/${leaveRequest.id}/cancel`,
        {
          method: "PATCH",
          body: {
            comment: comment || undefined,
          },
        },
      );

      setSuccessMessage("Leave request has been cancelled successfully.");
      await loadInitialData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to cancel leave request",
      );
    }
  }

  function resetForm() {
    setEditingRequestId(null);
    setFormValues(initialFormValues);
  }

  function canManageRequest(leaveRequest: LeaveRequest) {
    const currentEmployeeProfileId =
      user?.employeeProfileId ?? user?.employeeProfile?.id;

    return (
      leaveRequest.status === "PENDING" &&
      currentEmployeeProfileId === leaveRequest.employeeProfile.id
    );
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading leave requests...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Leave</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Leave Requests
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingRequestId ? "Edit Leave Request" : "Create Leave Request"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit leave request for manager approval.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="leaveTypeId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Leave Type
              </label>
              <select
                id="leaveTypeId"
                value={formValues.leaveTypeId}
                onChange={(event) =>
                  handleChange("leaveTypeId", event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                required
              >
                <option value="">Select leave type</option>
                {activeLeaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
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
                  value={formValues.startDate}
                  onChange={(event) =>
                    handleChange("startDate", event.target.value)
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
                  value={formValues.endDate}
                  onChange={(event) =>
                    handleChange("endDate", event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reason"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Reason
              </label>
              <textarea
                id="reason"
                value={formValues.reason}
                onChange={(event) => handleChange("reason", event.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                placeholder="Reason for leave"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingRequestId
                    ? "Update Request"
                    : "Create Request"}
              </button>

              {editingRequestId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Leave Request List
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Requests are filtered by your role permission from the backend.
            </p>
          </div>

          {leaveRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm text-slate-500">No leave requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((leaveRequest) => {
                const employeeName = `${leaveRequest.employeeProfile.firstName} ${leaveRequest.employeeProfile.lastName}`;
                const isManageable = canManageRequest(leaveRequest);

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
                          {leaveRequest.employeeProfile.department}
                        </p>
                      </div>

                      {isManageable ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(leaveRequest)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => cancelLeaveRequest(leaveRequest)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : null}
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
                      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        {leaveRequest.reason}
                      </p>
                    ) : null}

                    {leaveRequest.managerNote ? (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Manager note: {leaveRequest.managerNote}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
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

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}
