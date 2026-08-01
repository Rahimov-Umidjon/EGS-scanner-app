import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { axiosClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, authEvents } from '../api/axiosClient';

type User = {
  id: number;
  firstName: string;
  lastName: string;
  username?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ilova ochilganda saqlangan tokenni tekshirish
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (token) {
          const { data } = await axiosClient.get('/users/me');
          setUser(data);
        }
      } catch (e) {
        // Token yaroqsiz — sukut bo'yicha login sahifasiga yo'naltiriladi
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // axiosClient interceptor 401/refresh xato bo'lsa shu eventni chaqiradi
  useEffect(() => {
    const unsubscribe = authEvents.on('unauthorized', () => {
      setUser(null);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await axiosClient.post('/auth/login', { email, password });
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}