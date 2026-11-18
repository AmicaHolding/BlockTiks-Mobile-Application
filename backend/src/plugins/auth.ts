import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getMembership, getSession, touchSession, type Membership } from '../db';

export type OrgRole = 'admin' | 'cohost' | 'gate';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    // Verifies a bearer token when present but never rejects — request.user
    // is undefined for anonymous callers.
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    // X-Org-Id org-context guard (Studio). Returns a preHandler factory:
    //   preHandler: [app.authenticate, app.requireOrgRole(['admin','cohost'])]
    // Resolves the caller's ACTIVE membership in the org named by the
    // X-Org-Id header, enforces the role list, and sets request.org.
    requireOrgRole: (
      roles: OrgRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    org?: { orgId: string; membership: Membership };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string; sid?: string };
    user: { sub: string; email: string; role: string; sid?: string };
  }
}

const TOUCH_EVERY_MS = 5 * 60_000;

// v2 tokens carry a session id (`sid`); a revoked session (DELETE
// /me/sessions/:id, A7 contact change, account deletion) stops working
// immediately. Tokens without `sid` predate sessions and stay valid until expiry.
async function sessionActive(request: FastifyRequest): Promise<boolean> {
  const sid = request.user?.sid;
  if (!sid) return true;
  const session = await getSession(sid);
  if (!session || session.revokedAt || session.userId !== request.user.sub) return false;
  if (Date.now() - Date.parse(session.lastSeenAt) > TOUCH_EVERY_MS) void touchSession(sid);
  return true;
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
    if (!(await sessionActive(request))) {
      return reply.status(401).send({ code: 'session_revoked', message: 'This session was signed out' });
    }
  });
  app.decorate('authenticateOptional', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      // anonymous — request.user stays undefined
      return;
    }
    if (!(await sessionActive(request))) {
      (request as { user?: unknown }).user = undefined;
    }
  });
  app.decorate('requireOrgRole', (roles: OrgRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = request.headers['x-org-id'];
      if (!orgId || typeof orgId !== 'string') {
        return reply.status(400).send({ code: 'org_required', message: 'X-Org-Id header is required' });
      }
      const membership = await getMembership(request.user.sub, orgId);
      if (!membership) {
        return reply.status(403).send({ code: 'not_member', message: 'You are not a member of this organisation' });
      }
      if (!roles.includes(membership.role)) {
        return reply.status(403).send({ code: 'forbidden', message: 'Insufficient role for this action' });
      }
      request.org = { orgId, membership };
    };
  });
});
