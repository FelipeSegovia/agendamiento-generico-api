import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';

// H1.2 — Iniciar y cerrar sesión
describe('Sesión del profesional (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const registeredProfessional = {
    name: 'Ana Pérez',
    email: 'ana@ejemplo.cl',
    password: 'clave-segura',
    slug: 'ana-perez',
  };

  const postLogin = (credentials: object) =>
    request(app.getHttpServer()).post('/api/auth/login').send(credentials);

  const getSessionProfessional = (cookie?: string) => {
    const pendingRequest = request(app.getHttpServer()).get('/api/auth/me');
    return cookie ? pendingRequest.set('Cookie', cookie) : pendingRequest;
  };

  // Supertest tipa el header como string, pero Set-Cookie llega como lista.
  const setCookieHeadersOf = (response: request.Response): string[] =>
    response.get('Set-Cookie') ?? [];

  const sessionCookieFrom = (response: request.Response): string =>
    setCookieHeadersOf(response)[0].split(';')[0];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.professional.deleteMany();
    await request(app.getHttpServer())
      .post('/api/professionals')
      .send(registeredProfessional)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('con correo y clave correctos emite una cookie de sesión httpOnly', async () => {
    const response = await postLogin({
      email: 'ana@ejemplo.cl',
      password: 'clave-segura',
    }).expect(204);

    const setCookieHeaders = setCookieHeadersOf(response);
    expect(setCookieHeaders[0]).toMatch(/^professional_session=/);
    expect(setCookieHeaders[0]).toMatch(/HttpOnly/);
    expect(setCookieHeaders[0]).toMatch(/SameSite=Lax/);
    expect(setCookieHeaders[0]).toMatch(/Path=\//);
  });

  it('con la cookie de sesión entrega los datos del profesional, sin la clave', async () => {
    const response = await postLogin({
      email: 'ANA@ejemplo.cl',
      password: 'clave-segura',
    }).expect(204);

    const sessionResponse = await getSessionProfessional(
      sessionCookieFrom(response),
    ).expect(200);

    expect(sessionResponse.body).toMatchObject({
      name: 'Ana Pérez',
      slug: 'ana-perez',
    });
    expect(sessionResponse.body).not.toHaveProperty('passwordHash');
  });

  it.each([
    [
      'la clave no coincide',
      { email: 'ana@ejemplo.cl', password: 'otra-clave' },
    ],
    [
      'el correo no está registrado',
      { email: 'nadie@ejemplo.cl', password: 'clave-segura' },
    ],
  ])('rechaza con el mismo mensaje cuando %s', async (_case, credentials) => {
    const response = await postLogin(credentials)
      .expect(401)
      .expect(({ body }) =>
        expect(body.message).toBe('Correo o clave incorrectos.'),
      );

    expect(setCookieHeadersOf(response)).toEqual([]);
  });

  it('sin cookie de sesión pide iniciar sesión', async () => {
    await getSessionProfessional().expect(401);
  });

  it('rechaza una cookie alterada o firmada con otro secreto', async () => {
    const forgedToken = await new JwtService({
      secret: 'otro-secreto-que-no-es-el-de-la-api-0123456789',
    }).signAsync({ sub: 'cualquier-id' });

    await getSessionProfessional('professional_session=no-es-un-jwt').expect(
      401,
    );
    await getSessionProfessional(`professional_session=${forgedToken}`).expect(
      401,
    );
  });
});
