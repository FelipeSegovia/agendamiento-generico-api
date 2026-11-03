import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';

// Profesionales de ejemplo del backlog: Ana Pérez (psicóloga) y Bruno Díaz (abogado).
export const ana = {
  name: 'Ana Pérez',
  email: 'ana@ejemplo.cl',
  password: 'clave-segura',
  slug: 'ana-perez',
};
export const bruno = {
  name: 'Bruno Díaz',
  email: 'bruno@ejemplo.cl',
  password: 'clave-segura',
  slug: 'bruno-diaz',
};

// Registra al profesional y devuelve su cookie de sesión lista para el header Cookie.
export async function registerAndLogin(
  app: NestFastifyApplication,
  professional: typeof ana,
) {
  await request(app.getHttpServer())
    .post('/api/professionals')
    .send(professional)
    .expect(201);
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: professional.email, password: professional.password })
    .expect(204);
  // Supertest tipa el header como string, pero Set-Cookie llega como lista.
  const setCookieHeaders: string[] = response.get('Set-Cookie') ?? [];
  return setCookieHeaders[0].split(';')[0];
}
