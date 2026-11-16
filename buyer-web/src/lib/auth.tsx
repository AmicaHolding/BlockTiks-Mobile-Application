import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getRefreshToken, getToken, setRefreshToken, setToken, type User } from './api';

interface AuthState {
  user: User | null;
  authed: boolean;
  booting: boolean;
  refresh: () => Promise<void>;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken() && !getRefreshToken()) {
      setUser(null);
      setBooting(false);
      return;
    }
    try {
      const res = await api.me();
      setUser(res.user);
    } catch {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback((token: string, nextUser: User) => {
    setToken(token);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, authed: Boolean(user), booting, refresh, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
