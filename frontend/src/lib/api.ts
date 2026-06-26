import { clearAuth, getAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (options.auth !== false) {
    const token = getAccessToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errerBody = await response.json().catch(() => null);

    if (response.status === 401) {
      clearAuth();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    const message = Array.isArray(errerBody?.message)
      ? errerBody.message.join(", ")
      : errerBody?.message;

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
