import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiConstants, ApiUrls } from '@/constants/Api';
import { Storage } from './storage';

export class ApiException extends Error {
  statusCode?: number;
  url?: string;
  response?: AxiosResponse['data'];

  constructor(message: string, url?: string, statusCode?: number, response?: AxiosResponse['data']) {
    super(message);
    this.url = url;
    this.statusCode = statusCode;
    this.response = response;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig extends Omit<AxiosRequestConfig, 'method' | 'url' | 'data'> {
  onSuccess?: (response: AxiosResponse) => void | Promise<void>;
  onError?: (error: ApiException) => void | Promise<void>;
  onLoading?: () => void;
}

let isShowingError = false;
let isSessionExpired = false;

class BaseClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ApiConstants.baseUrl,
      timeout: ApiConstants.timeoutMs,
      headers: {
        'x-access-token': ApiConstants.commonHeaderValue,
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await Storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await this.handleSessionExpiry();
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleSessionExpiry() {
    if (!isSessionExpired) {
      isSessionExpired = true;
      await Storage.clearAll();
      // Navigation reset is handled by the auth gate
    }
  }

  private async execute<T = unknown>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    config?.onLoading?.();

    try {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        ...config,
      });
      await config?.onSuccess?.(response as AxiosResponse);
      return response.data;
    } catch (error) {
      const apiError = this.normalizeError(error as AxiosError, url);
      await config?.onError?.(apiError);
      throw apiError;
    }
  }

  private normalizeError(error: AxiosError, url: string): ApiException {
    const message =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'Something went wrong';

    if (error.code === 'ECONNABORTED' || !error.response) {
      return new ApiException('Server is not responding', url, 0);
    }

    if (error.response.status >= 500) {
      return new ApiException('Server error', url, error.response.status, error.response.data);
    }

    return new ApiException(message, url, error.response.status, error.response.data);
  }

  async get<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.execute<T>('GET', url, undefined, config);
  }

  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.execute<T>('POST', url, data, config);
  }

  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.execute<T>('PUT', url, data, config);
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.execute<T>('PATCH', url, data, config);
  }

  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    return this.execute<T>('DELETE', url, undefined, config);
  }

  getAxiosInstance() {
    return this.client;
  }
}

export const api = new BaseClient();
export { ApiUrls, ApiConstants };
