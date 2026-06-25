"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { formatDate, formatDays } from "@/lib/format";
import { getAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";
import type {
  LeaveRequest,
  LeaveRequestsFormValues,
  LeaveType,
} from "@/types/leave";

const initialFormValues: LeaveRequestsFormValues = {
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
    useState<LeaveRequestsFormValues>(initialFormValues);
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

  function handleChange(field: keyof LeaveRequestsFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      requestFormReset();
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
      await apiRequest<LeaveRequest>("/leave-requests/");
    } catch (error) {}
  }
}
