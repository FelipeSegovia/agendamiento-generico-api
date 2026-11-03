import type { FastifyRequest } from 'fastify';

// El front reenvía esta cookie con el mismo nombre; si cambia aquí, cambia también allá.
export const SESSION_COOKIE_NAME = 'professional_session';

export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = { sub: string };

export type AuthenticatedRequest = FastifyRequest & { professionalId: string };
