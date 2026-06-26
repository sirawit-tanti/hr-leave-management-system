export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type AuthEmployeeProfile = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  employeeProfileId?: string | null;
  employeeProfile?: AuthEmployeeProfile | null;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};
