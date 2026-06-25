import type { AuthUser, LoginResponse } from "../types/auth";

const ACCESS_TOKEN_KEY = "hr_leave_access_token";
const USER_KEY = "hr_leave_user";

export function saveAuth(loginResponse: LoginResponse) {
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
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
