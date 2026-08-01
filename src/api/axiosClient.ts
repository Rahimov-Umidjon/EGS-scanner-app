import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// .env.development / .env.production fayllaridan olinadi (EXPO_PUBLIC_ prefiksi shart)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL as string;

if (!API_BASE_URL) {
  // Build paytida .env fayl to'g'ri ulanmagan bo'lsa, shuni tez bilib olish uchun
  console.warn(
    '[axiosClient] EXPO_PUBLIC_API_URL aniqlanmadi — .env faylni tekshiring'
  );
}

console.log(API_BASE_URL)

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- So'rov yuborishdan oldin token qo'shish ---
axiosClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- 401 kelsa, tokenni yangilash (refresh) ---
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Boshqa so'rov token yangilanishini kutmoqda bo'lsa, navbatga qo'shamiz
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(axiosClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('Refresh token topilmadi');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
        if (data.refreshToken) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
        }

        processQueue(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(null);
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        // AuthContext bu holatni "logout" eventi orqali ushlab oladi (pastga qarang)
        authEvents.emit('unauthorized');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Oddiy event-emitter — interceptor ichidan AuthContext'ga "logout qil" deb signal berish uchun
type Listener = () => void;
class AuthEventEmitter {
  private listeners: Record<string, Listener[]> = {};
  on(event: string, cb: Listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
    };
  }
  emit(event: string) {
    (this.listeners[event] || []).forEach((cb) => cb());
  }
}
export const authEvents = new AuthEventEmitter();