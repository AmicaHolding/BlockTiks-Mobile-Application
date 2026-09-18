import { create } from 'zustand';
import { Storage } from '@/services/storage';

export interface User {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string | null;
  role?: 'user' | 'creator';
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  isHydrated: boolean;
  setAuth: (token: string, refreshToken: string, user: User) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  setRole: (role: User['role']) => Promise<void>;
  updateToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isLoading: true,
  isHydrated: false,

  setAuth: async (token, refreshToken, user) => {
    await Storage.setToken(token);
    await Storage.setRefreshToken(refreshToken);
    await Storage.setUser(user);
    set({ token, refreshToken, user });
  },

  setUser: async (user) => {
    await Storage.setUser(user);
    set({ user });
  },

  setRole: async (role) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const updated = { ...current, role };
    await Storage.setUser(updated);
    set({ user: updated });
  },

  updateToken: async (token) => {
    await Storage.setToken(token);
    set({ token });
  },

  logout: async () => {
    await Storage.clearAll();
    set({ token: null, refreshToken: null, user: null });
  },

  hydrate: async () => {
    const [token, refreshToken, user] = await Promise.all([
      Storage.getToken(),
      Storage.getRefreshToken(),
      Storage.getUser<User>(),
    ]);
    set({ token, refreshToken, user, isLoading: false, isHydrated: true });
  },
}));
