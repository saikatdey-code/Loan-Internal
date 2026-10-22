/**
 * Axios HTTP client with request/response interceptors.
 */
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {getToken, removeToken} from '../services/storage';

import {API_BASE_URL} from './config';

// ─── Base Configuration ──────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://wemanipur.com',
    Referer: 'https://wemanipur.com/',
  },
});

// ─── Request Interceptor ────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      );
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('[API] Request error:', error.message);
    return Promise.reject(error);
  },
);

// ─── Response Interceptor ───────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear stored token
      console.warn('[API] Unauthorized (401) — clearing auth token.');
      await removeToken();
      // TODO: Navigate to login screen or trigger re-auth flow
    }

    if (status === 403) {
      console.warn('[API] Forbidden (403) — insufficient permissions.');
    }

    if (status === 500) {
      console.error('[API] Internal Server Error (500).');
    }

    if (!error.response) {
      console.error('[API] Network error — no response received.');
    }

    return Promise.reject(error);
  },
);

export default apiClient;
