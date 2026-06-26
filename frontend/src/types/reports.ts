import type { EmployeeProfileSummary, LeaveType } from "./leave";

export type LeaveUsageByEmployee = {
  employeeProfileId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  totalRequests: number;
  totalUsedDays: number;
};

export type LeaveUsageByLeaveType = {
  leaveTypeId: string;
  leaveTypeName: string;
  totalRequests: number;
  totalUsedDays: number;
};

export type LeaveUsageItem = {
  id: string;
  employee: EmployeeProfileSummary;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  status: string;
  reason?: string | null;
};

export type LeaveUsageReportResponse = {
  range: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRequests: number;
    totalUsedDays: number;
  };
  byEmployee: LeaveUsageByEmployee[];
  byLeaveType: LeaveUsageByLeaveType[];
  items: LeaveUsageItem[];
};

export type LeaveBalanceByEmployee = {
  employeeProfileId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
};

export type LeaveBalanceItem = {
  id: string;
  year: number;
  employee: EmployeeProfileSummary;
  leaveType: LeaveType;
  totalDays: number | string;
  usedDays: number | string;
  remainingDays: number | string;
};

export type LeaveBalanceReportResponse = {
  summary: {
    totalRows: number;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
  };
  byEmployee: LeaveBalanceByEmployee[];
  items: LeaveBalanceItem[];
};
