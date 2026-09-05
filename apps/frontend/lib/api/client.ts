import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth-store';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Necessary to send and receive HttpOnly cookies
});

// Flag to track if a refresh request is currently active
let isRefreshing = false;
// Queue to hold pending requests while token is refreshing
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 and Token Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401, not a retry, and not trying to hit the refresh or login endpoint itself
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest._retry && 
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.url !== '/auth/login'
    ) {
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string, user: any }>('/api/v1/auth/refresh', {}, {
          withCredentials: true,
        });
        
        const newAccessToken = data.accessToken;
        
        // Update the Zustand store with the new access token and user profile
        if (data.user) {
          useAuthStore.getState().setAuth(data.user, newAccessToken);
        } else {
          useAuthStore.getState().setAccessToken(newAccessToken);
        }
        
        // Process queued requests with the new token
        processQueue(null, newAccessToken);
        
        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // If refresh fails, process queue with error and clear auth state
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        
        // Redirect to login (handled smoothly in client-side router or via window)
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
