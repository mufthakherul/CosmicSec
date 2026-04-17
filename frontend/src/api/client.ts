/**
 * CosmicSec Centralized API Client
 *
 * Single Axios instance with interceptors for auth, retry, and cancellation.
 * All pages should use this client instead of inline fetch() calls.
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ensureApiGatewayBaseUrl, getApiGatewayBaseUrl } from "./runtimeEndpoints";

const BASE_URL = getApiGatewayBaseUrl();

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

/* ---------- Request interceptor: attach Authorization header ---------- */
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const dynamicBaseUrl = await ensureApiGatewayBaseUrl();
  if (dynamicBaseUrl) {
    config.baseURL = dynamicBaseUrl;
  }

  const token = localStorage.getItem("cosmicsec_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---------- Response interceptor: 401 redirect + retry on 5xx ---------- */
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // exponential backoff base (ms)

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };

    // 401 — session expired
    if (error.response?.status === 401) {
      localStorage.removeItem("cosmicsec_token");
      localStorage.removeItem("cosmicsec_user");
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
        window.location.href = "/auth/login";
      }
      return Promise.reject(error);
    }

    // Retry on 5xx
    if (
      error.response &&
      error.response.status >= 500 &&
      config &&
      (config._retryCount ?? 0) < MAX_RETRIES
    ) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      const delay = RETRY_DELAY_BASE * 2 ** (config._retryCount - 1);
      await new Promise((r) => setTimeout(r, delay));
      return client(config);
    }

    return Promise.reject(error);
  },
);

export default client;
