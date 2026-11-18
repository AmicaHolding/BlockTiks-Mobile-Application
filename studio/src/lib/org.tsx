import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setOrgId, type User } from './api';
import type { LocalOrg, OrgRole } from './store';

interface OrgContextValue {
  user: User;
  ready: boolean;
  orgs: LocalOrg[];
  org: LocalOrg | null;
  /** Effective role — membership role unless a dev preview override is set. */
  role: OrgRole;
  /** The user's real membership role on the active org (ignores override). */
  actualRole: OrgRole;
  /** Dev-only role preview so Admin can check the Co-host/Gate surfaces. */
  roleOverride: OrgRole | null;
  setRoleOverride: (r: OrgRole | null) => void;
  setActiveOrg: (orgId: string) => void;
  refresh: () => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ user, children }: { user: User; children: ReactNode }) {
  const [orgs, setOrgs] = useState<LocalOrg[]>([]);
  const [org, setOrg] = useState<LocalOrg | null>(null);
  const [roleOverride, setRoleOverride] = useState<OrgRole | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const memberships = api.memberships(user.id);
    setOrgs(memberships.map((m) => m.org));
    const activeId = apiActiveOrgId();
    const active =
      memberships.find((m) => m.org.id === activeId)?.org ?? memberships[0]?.org ?? null;
    setOrg(active ? { ...active } : null);
    if (active) setOrgId(active.id);
    else setOrgId(null);
    setReady(true);
  }, [user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveOrg = useCallback((orgId: string) => {
    setOrgId(orgId);
    setOrgs((prev) => prev);
    const found = api.org(orgId);
    setOrg(found ? { ...found } : null);
  }, []);

  const actualRole: OrgRole = useMemo(() => {
    if (!org) return 'admin';
    const membership = api.memberships(user.id).find((m) => m.org.id === org.id);
    return membership?.role ?? 'admin';
  }, [org, user.id]);
  const role = roleOverride ?? actualRole;

  const value = useMemo<OrgContextValue>(
    () => ({
      user,
      ready,
      orgs,
      org,
      role,
      actualRole,
      roleOverride,
      setRoleOverride,
      setActiveOrg,
      refresh,
    }),
    [user, ready, orgs, org, role, actualRole, roleOverride, setActiveOrg, refresh],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

function apiActiveOrgId(): string | null {
  return localStorage.getItem('sahra_studio_org');
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside OrgProvider');
  return ctx;
}
