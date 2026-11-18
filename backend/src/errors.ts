import type { FastifyReply } from 'fastify';

// Spec error shape for NEW endpoints: {code, message, field?}.
// Legacy endpoints keep {message} — use reply.send({message, code}) there
// when a code is additive-safe.
export function specError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  field?: string,
  extra?: Record<string, unknown>
) {
  return reply.status(status).send({ code, message, ...(field ? { field } : {}), ...extra });
}
