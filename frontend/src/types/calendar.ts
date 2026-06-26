import type { EmployeeProfileSummary, LeaveType } from "./leave";

export type CalendarLeaveEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDays: string | number;
  status: string;
  leaveType: LeaveType;
  employee: EmployeeProfileSummary;
};

export type CalendarResponse = {
  range: {
    startDate: string;
    endDate: string;
  };
  events: CalendarLeaveEvent[];
};
