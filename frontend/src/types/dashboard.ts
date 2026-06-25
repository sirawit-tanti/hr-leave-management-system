export type EmployeeSummary = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position?: string;
  department: string;
  managerId?: string | null;
};

export type LeaveTypeSummary = {
  id: string;
  name: string;
  isPaid?: boolean;
  isActive?: boolean;
};

export type LeaveRequestSummary = {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  status: string;
  reason?: string | null;
  managerNote?: string | null;
  createdAt?: string;
  employeeProfile: EmployeeSummary;
  leaveType: LeaveTypeSummary;
};

export type LeaveBalanceSummary = {
  id: string;
  year: number;
  totalDays: number | string;
  usedDays: number | string;
  remainingDays: number | string;
  leaveType: LeaveTypeSummary;
};

export type LeaveUsageByType = {
  leaveTypeId: string;
  name: string;
  usedDays: number;
};

export type AdminDashboardResponse = {
  role: "ADMIN";
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    pendingRequests: number;
    approvedRequest: number;
    rejectedRequests: number;
    cancelledRequests: number;
  };
  leaveUsageByType: LeaveUsageByType[];
  recentLeaveRequests: LeaveRequestSummary[];
};

export type ManagerDashboardResponse = {
  role: "MANAGER";
  summary: {
    teamMembersCount: number;
    pendingApprovalsCount: number;
    totalRemainingDays: number;
  };
  myLeaveBalances: LeaveBalanceSummary[];
  pendingApprovals: LeaveRequestSummary[];
  recentTeamLeaveRequests: LeaveRequestSummary[];
  myRecentLeaveRequests: LeaveRequestSummary[];
};

export type EmployeeDashboardResponse = {
  role: "EMPLOYEE";
  summary: {
    totalRemainingDays: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    cancelledRequests: number;
  };
  myLeaveBalances: LeaveBalanceSummary[];
  recentLeaveRequests: LeaveRequestSummary[];
};

export type DashboardResponse =
  | AdminDashboardResponse
  | ManagerDashboardResponse
  | EmployeeDashboardResponse;
