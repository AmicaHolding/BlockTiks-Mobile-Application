import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, getRefreshToken, getToken, setRefreshToken, setToken, type User } from './api';
import SignInModal from '../components/SignInModal';

/** Why sign-in was opened. Anything other than 'menu' is action-triggered
 *  (rule A2): onboarding steps are skipped and the action resumes after. */
export type SignInReason = 'menu' | 'buy' | 'rsvp' | 'plans' | 'profile' | 'host' | 'sell' | 'offer' | 'other';

interface SignInRequest {
  reason: SignInReason;
  onDone?: () => void;
}

interface AuthState {
  user: User | null;
  authed: boolean;
  booting: boolean;
  refresh: () => Promise<void>;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  /** Runs `onDone` now when signed in, otherwise opens in-context sign-in and
   *  runs it once the user is in. */
  requireAuth: (reason: SignInReason, onDone?: () => void) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [request, setRequest] = useState<SignInRequest | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const refresh = useCallback(async () => {
    if (!getToken() && !getRefreshToken()) {
      setUserState(null);
      setBooting(false);
      return;
    }
    try {
      const res = await api.me();
      setUserState(res.user);
    } catch {
      setToken(null);
      setRefreshToken(null);
      setUserState(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback((token: string, nextUser: User, refreshToken?: string) => {
    setToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    setUserState(nextUser);
  }, []);

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined);
    setToken(null);
    setRefreshToken(null);
    setUserState(null);
  }, []);

  const requireAuth = useCallback((reason: SignInReason, onDone?: () => void) => {
    if (userRef.current) {
      onDone?.();
      return;
    }
    setRequest({ reason, onDone });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authed: Boolean(user),
        booting,
        refresh,
        login,
        logout,
        setUser: setUserState,
        requireAuth,
      }}
    >
      {children}
      {request ? (
        <SignInModal
          reason={request.reason}
          onClose={() => setRequest(null)}
          onDone={() => {
            const next = request.onDone;
            setRequest(null);
            next?.();
          }}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
