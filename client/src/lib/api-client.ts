const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Check token in client storage as fallback for cookie
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("icsr_auth_token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Supports HttpOnly cookies
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      if (localStorage.getItem("icsr_auth_token")) {
        localStorage.removeItem("icsr_auth_token");
      }
    }
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg) as Error & { status: number; errors?: any[] };
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }

  return data as T;
}
