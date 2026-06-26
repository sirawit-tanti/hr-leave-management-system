import type { Role } from "./auth";
import type { EmployeeProfileSummary, LeaveType } from "./leave";

export type EmploymentStatus = "ACTIVE" | "INACTIVE";

export type AdminEmployeeProfile = EmployeeProfileSummary & {
  hireDate: string;
  status: EmploymentStatus;
  managerId?: string | null;
  manager?: EmployeeProfileSummary | null;
  leaveBalances?: AdminLeaveBalance[];
};

export type AdminLeaveBalance = {
  id: string;
  year: number;
  totalDays: number | string;
  usedDays: number | string;
  remainingDays: number | string;
  leaveType: LeaveType;
};

export type AdminUser = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeProfile: AdminEmployeeProfile | null;
};

export type AdminUserFormValues = {
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  hireDate: string;
  managerId: string;
  status: EmploymentStatus;
};
