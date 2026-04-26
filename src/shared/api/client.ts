import axios from 'axios';

export type Result<T> = {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
};

export type BizError = {
  code: number;
  message: string;
  status?: number;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8091',
  timeout: 15_000,
  paramsSerializer: {
    serialize(params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === '') return;
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, String(item)));
          return;
        }
        searchParams.append(key, String(value));
      });
      return searchParams.toString();
    },
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('idea-island-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as Result<unknown>;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      const error: BizError = {
        code: body.code,
        message: body.message || '请求失败',
        status: response.status,
      };
      throw error;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('idea-island-token');
    }
    throw {
      code: error.response?.data?.code ?? error.response?.status ?? -1,
      message: error.response?.data?.message ?? error.message ?? '网络请求失败',
      status: error.response?.status,
    } satisfies BizError;
  },
);

export function shouldUseMockApi() {
  return import.meta.env.VITE_USE_MOCK !== 'false';
}

export const api = {
  get<T>(url: string, config?: Parameters<typeof apiClient.get>[1]) {
    return apiClient.get<T, T>(url, config);
  },
  post<T>(url: string, data?: unknown, config?: Parameters<typeof apiClient.post>[2]) {
    return apiClient.post<T, T>(url, data, config);
  },
  put<T>(url: string, data?: unknown, config?: Parameters<typeof apiClient.put>[2]) {
    return apiClient.put<T, T>(url, data, config);
  },
  patch<T>(url: string, data?: unknown, config?: Parameters<typeof apiClient.patch>[2]) {
    return apiClient.patch<T, T>(url, data, config);
  },
  delete<T>(url: string, config?: Parameters<typeof apiClient.delete>[1]) {
    return apiClient.delete<T, T>(url, config);
  },
};
