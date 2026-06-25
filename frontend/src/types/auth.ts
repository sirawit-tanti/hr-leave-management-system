export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  employeeProfileId: string | null;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};
