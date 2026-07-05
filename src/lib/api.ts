import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { API_BASE_URL } from "./config";
import { useAuthStore } from "./auth-store";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) {
    logout();
    return null;
  }
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = res.data;
    setTokens(access_token, refresh_token);
    return access_token as string;
  } catch {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/register")
    ) {
      original._retry = true;
      if (!refreshing) refreshing = performRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    // Global toasts for common errors — skip 401 (handled) and 402 (component-handled)
    if (typeof window !== "undefined" && status && status !== 401 && status !== 402) {
      const data = error.response?.data as { detail?: string } | undefined;
      const msg = data?.detail || error.message || "Request failed";
      if (status >= 500) toast.error("Server error", { description: msg });
      else if (status === 409) toast.error("Conflict", { description: msg });
      else if (status === 413) toast.error("File too large", { description: "10MB maximum" });
      else if (status === 422) toast.error("Unprocessable", { description: msg });
      else if (status === 403) toast.error("Forbidden", { description: msg });
    }

    return Promise.reject(error);
  },
);
