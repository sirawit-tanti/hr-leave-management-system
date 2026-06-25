export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type EmployeeProfileSummary = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position?: string;
  department: string;
  managerId?: string | null;
};

export type LeaveType = {
  id: string;
  name: string;
  description?: string | null;
  defaultDaysPerYear: number | string;
  isPaid: boolean;
  isActive: boolean;
};

export type ApprovalAction = {
  id: string;
  action: string;
  comment?: string | null;
  createdAt: string;
  actorProfile?: EmployeeProfileSummary | null;
};

export type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  status: LeaveRequestStatus;
  reason?: string | null;
  managerNote?: string | null;
  deciedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employeeProfile: EmployeeProfileSummary;
  leaveType: LeaveType;
  approvalActions?: ApprovalAction[];
};

export type LeaveRequestsFormValues = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
};
