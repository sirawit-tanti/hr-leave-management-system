import type { AuthUser, LoginResponse, Role } from "@/types/auth";

const ACCESS_TOKEN_KEY = "hr_leave_access_token";
const USER_KEY = "hr_leave_user";

export function saveAuth(loginResponse: LoginResponse) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, loginResponse.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(loginResponse.user));
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const user = localStorage.getItem(USER_KEY);

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentEmployeeProfileId(user: AuthUser | null) {
  return user?.employeeProfileId ?? user?.employeeProfile?.id ?? null;
}

export function isRoleAllowed(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}
