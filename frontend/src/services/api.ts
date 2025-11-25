import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import config from '../config';
import { Product, Order } from '../types';
import Logger from '../utils/logger';

const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    Logger.info('API request initiated', {
      method: config.method?.toUpperCase(),
      url: config.url,
      base_url: config.baseURL,
    });
    return config;
  },
  (error) => {
    Logger.error('API request error', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    Logger.info('API response received', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      Logger.error('API response error', error, {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
    } else {
      Logger.error('API unknown error', error);
    }
    return Promise.reject(error);
  }
);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Exponential backoff retry logic
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryRequest<T>(
  requestFn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
      Logger.warn('Request failed, retrying', {
        delay_ms: delay,
        retries_left: retries,
      });
      await sleep(delay);
      return retryRequest(requestFn, retries - 1);
    }
    Logger.error('Request failed after all retries', error);
    throw error;
  }
}

function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  
  // Retry on network errors or 5xx server errors
  return !error.response || (error.response.status >= 500 && error.response.status < 600);
}

// API methods
export const productService = {
  async getAll(): Promise<Product[]> {
    return retryRequest(async () => {
      const response = await api.get<Product[]>('/api/products');
      return response.data;
    });
  },

  async getById(id: number): Promise<Product> {
    return retryRequest(async () => {
      const response = await api.get<Product>(`/api/products/${id}`);
      return response.data;
    });
  },
};

export const orderService = {
  async create(order: Order): Promise<Order> {
    return retryRequest(async () => {
      const response = await api.post<Order>('/api/orders', order);
      return response.data;
    });
  },

  async getById(id: number): Promise<Order> {
    return retryRequest(async () => {
      const response = await api.get<Order>(`/api/orders/${id}`);
      return response.data;
    });
  },
};

export default api;
