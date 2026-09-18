import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const ONBOARDING_KEY = 'onboarding_seen';

export const Storage = {
  async setToken(token: string) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },
  async removeToken() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },

  async setRefreshToken(token: string) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async removeRefreshToken() {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async setUser(user: object) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },
  async getUser<T = unknown>(): Promise<T | null> {
    const value = await SecureStore.getItemAsync(USER_KEY);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },
  async removeUser() {
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  async setOnboardingSeen() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  },
  async hasSeenOnboarding(): Promise<boolean> {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === 'true';
  },

  async clearAll() {
    await Promise.all([
      SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  },
};
