"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import { apiRequest } from "@/lib/api";
import type {
  AdminUser,
  AdminUserFormValues,
  EmploymentStatus,
} from "@/types/admin";
import type { Role } from "@/types/auth";
import { formatDate } from "@/lib/format";

const initialFormValues: AdminUserFormValues = {
  email: "",
  password: "password123",
  role: "EMPLOYEE",
  isActive: true,
  employeeCode: "",
  firstName: "",
  lastName: "",
  position: "",
  department: "",
  hireDate: toDateInputValue(new Date()),
  managerId: "",
  status: "ACTIVE",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [formValues, setFormValues] =
    useState<AdminUserFormValues>(initialFormValues);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const managerOptions = useMemo(() => {
    return users
      .filter((user) => user.employeeProfile)
      .map((user) => user.employeeProfile!)
      .filter((profile) => {
        if (!editingUserId) {
          return true;
        }

        const editingUser = users.find((user) => user.id === editingUserId);
        return profile.id !== editingUser?.employeeProfile?.id;
      });
  }, [users, editingUserId]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setError("");
    setIsLoading(true);

    try {
      const response = await apiRequest<AdminUser[]>("/admin/users");
      setUsers(response);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(
    field: keyof AdminUserFormValues,
    value: string | boolean,
  ) {
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
      if (editingUserId) {
        await apiRequest<AdminUser>(`/admin/users/${editingUserId}`, {
          method: "PATCH",
          body: {
            email: formValues.email,
            role: formValues.role,
            isActive: formValues.isActive,
            employeeCode: formValues.employeeCode,
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            position: formValues.position,
            department: formValues.department,
            hireDate: formValues.hireDate,
            status: formValues.status,
            managerId: formValues.managerId || null,
          },
        });

        setSuccessMessage("User has been updated successfully.");
      } else {
        await apiRequest<AdminUser>("/admin/users/", {
          method: "POST",
          body: {
            email: formValues.email,
            password: formValues.password,
            role: formValues.role,
            isActive: formValues.isActive,
            employeeCode: formValues.employeeCode,
            firstName: formValues.firstName,
            lastName: formValues.lastName,
            position: formValues.position,
            department: formValues.department,
            hireDate: formValues.hireDate,
            managerId: formValues.managerId || undefined,
          },
        });

        setSuccessMessage("User has been created successfully.");
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save user");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(user: AdminUser) {
    if (!user.employeeProfile) {
      setError("Employee profile not found for this user");
      return;
    }

    setEditingUserId(user.id);
    setError("");
    setSuccessMessage("");

    setFormValues({
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive,
      employeeCode: user.employeeProfile.employeeCode,
      firstName: user.employeeProfile.firstName,
      lastName: user.employeeProfile.lastName,
      position: user.employeeProfile.position ?? "",
      department: user.employeeProfile.department,
      hireDate: toDateInputValue(user.employeeProfile.hireDate),
      managerId: user.employeeProfile.managerId ?? "",
      status: user.employeeProfile.status,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function resetPassword(user: AdminUser) {
    const password = window.prompt(`New password for ${user.email}`);

    if (password === null) {
      return;
    }

    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await apiRequest(`/admin/users/${user.id}/reset-password`, {
        method: "PATCH",
        body: {
          password: password.trim(),
        },
      });

      setSuccessMessage("Password has been reset successfully.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to reset password",
      );
    }
  }

  function resetForm() {
    setEditingUserId(null);
    setFormValues(initialFormValues);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading users...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-500">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          User Management
        </h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingUserId ? "Edit User" : "Create User"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage user account and employee profile.
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
            <FormInput
              id="email"
              label="Email"
              type="email"
              value={formValues.email}
              onChange={(value) => handleChange("email", value)}
              required
            />

            {!editingUserId ? (
              <FormInput
                id="password"
                label="Password"
                type="password"
                value={formValues.password}
                onChange={(value) => handleChange("password", value)}
                required
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Role
                </label>
                <select
                  id="role"
                  value={formValues.role}
                  onChange={(event) =>
                    handleChange("role", event.target.value as Role)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Employment Status
                </label>
                <select
                  id="status"
                  value={formValues.status}
                  onChange={(event) =>
                    handleChange(
                      "status",
                      event.target.value as EmploymentStatus,
                    )
                  }
                  disabled={!editingUserId}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:bg-slate-100"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formValues.isActive}
                onChange={(event) =>
                  handleChange("isActive", event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              User account is active
            </label>

            <div className="border-t border-slate-200 pt-4">
              <p className="mb-4 text-sm font-semibold text-slate-900">
                Employee Profile
              </p>

              <div className="space-y-4">
                <FormInput
                  id="employeeCode"
                  label="Employee Code"
                  value={formValues.employeeCode}
                  onChange={(value) => handleChange("employeeCode", value)}
                  required
                />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <FormInput
                    id="firstName"
                    label="First Name"
                    value={formValues.firstName}
                    onChange={(value) => handleChange("firstName", value)}
                    required
                  />

                  <FormInput
                    id="lastName"
                    label="Last Name"
                    value={formValues.lastName}
                    onChange={(value) => handleChange("lastName", value)}
                    required
                  />
                </div>

                <FormInput
                  id="position"
                  label="Position"
                  value={formValues.position}
                  onChange={(value) => handleChange("position", value)}
                  required
                />

                <FormInput
                  id="department"
                  label="Department"
                  value={formValues.department}
                  onChange={(value) => handleChange("department", value)}
                  required
                />

                <FormInput
                  id="hireDate"
                  label="Hire Date"
                  type="date"
                  value={formValues.hireDate}
                  onChange={(value) => handleChange("hireDate", value)}
                  required
                />

                <div>
                  <label
                    htmlFor="managerId"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Manager
                  </label>
                  <select
                    id="managerId"
                    value={formValues.managerId}
                    onChange={(event) =>
                      handleChange("managerId", event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                  >
                    <option value="">No manager</option>
                    {managerOptions.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.employeeCode} - {profile.firstName}{" "}
                        {profile.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingUserId
                    ? "Update User"
                    : "Create User"}
              </button>

              {editingUserId ? (
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
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            <p className="mt-1 text-sm text-slate-500">
              User accounts with employee profile information.
            </p>
          </div>

          {users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm text-slate-500">No users found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onEdit={() => startEdit(user)}
                  onResetPassword={() => resetPassword(user)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UserCard({
  user,
  onEdit,
  onResetPassword,
}: {
  user: AdminUser;
  onEdit: () => void;
  onResetPassword: () => void;
}) {
  const profile = user.employeeProfile;
  const employeeName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : "No profile";

  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{employeeName}</h3>
            <Badge label={user.role} />
            <Badge
              label={user.isActive ? "ACTIVE ACCOUNT" : "INACTIVE ACCOUNT"}
              variant={user.isActive ? "success" : "muted"}
            />
            {profile ? (
              <Badge
                label={profile.status}
                variant={profile.status === "ACTIVE" ? "success" : "muted"}
              />
            ) : null}
          </div>

          <p className="mt-1 text-sm text-slate-500">{user.email}</p>

          {profile ? (
            <p className="mt-1 text-sm text-slate-500">
              {profile.employeeCode} · {profile.department} · {profile.position}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onResetPassword}
            className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
          >
            Reset Password
          </button>
        </div>
      </div>

      {profile ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoBox label="Hire Date" value={formatDate(profile.hireDate)} />
          <InfoBox
            label="Manager"
            value={
              profile.manager
                ? `${profile.manager.firstName} ${profile.manager.lastName}`
                : "-"
            }
          />
          <InfoBox label="Created At" value={formatDate(user.createdAt)} />
        </div>
      ) : null}
    </article>
  );
}

function FormInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
        required={required}
      />
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

function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "success" | "muted";
}) {
  const classNameByVariant = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    muted: "bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold",
        classNameByVariant[variant],
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function toDateInputValue(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
