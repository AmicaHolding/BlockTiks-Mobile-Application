import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setOrgId, type StudioOrg, type User, type Membership } from './api';
import type { OrgRole } from './store';

interface OrgContextValue {
  user: User;
  ready: boolean;
  orgs: StudioOrg[];
  org: StudioOrg | null;
  memberships: Membership[];
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
  const [orgs, setOrgs] = useState<StudioOrg[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [org, setOrg] = useState<StudioOrg | null>(null);
  const [roleOverride, setRoleOverride] = useState<OrgRole | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    api
      .memberships()
      .then(async (list) => {
        setMemberships(list.map((m) => m.membership));
        const activeId = apiActiveOrgId();
        const entry = list.find((m) => m.org.id === activeId) ?? list[0] ?? null;
        setOrgs(list.map((m) => m.org));
        if (entry) {
          setOrgId(entry.org.id);
          // Full org read for verification/bank details; fall back to the
          // membership summary when GET /orgs/{id} is unavailable.
          const full = (await api.org(entry.org.id)) ?? entry.org;
          setOrg({ ...full });
        } else {
          setOrgId(null);
          setOrg(null);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveOrg = useCallback((orgId: string) => {
    setOrgId(orgId);
    api.org(orgId).then((found) => {
      if (found) setOrg({ ...found });
    });
  }, []);

  const actualRole: OrgRole = useMemo(() => {
    if (!org) return 'admin';
    const membership = memberships.find((m) => m.org_id === org.id);
    return membership?.role ?? 'admin';
  }, [org, memberships]);
  const role = roleOverride ?? actualRole;

  const value = useMemo<OrgContextValue>(
    () => ({
      user,
      ready,
      orgs,
      org,
      memberships,
      role,
      actualRole,
      roleOverride,
      setRoleOverride,
      setActiveOrg,
      refresh,
    }),
    [user, ready, orgs, org, memberships, role, actualRole, roleOverride, setActiveOrg, refresh],
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
