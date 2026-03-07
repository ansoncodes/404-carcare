"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (!original || status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    try {
      const refreshRes = await axios.post<{ access: string }>(`${API_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });
      const { access } = refreshRes.data;
      const state = useAuthStore.getState();
      if (state.user) {
        state.setAuth({ user: state.user, tokens: { access, refresh: refreshToken } });
      } else {
        state.setTokens({ access, refresh: refreshToken });
      }
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    }
  }
);

export default api;