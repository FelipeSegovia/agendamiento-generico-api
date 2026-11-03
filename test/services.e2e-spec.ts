import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';

// H1.3 — Crear mi primer servicio
describe('Servicios del profesional (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let anaCookie: string;
  let brunoCookie: string;

  const ana = {
    name: 'Ana Pérez',
    email: 'ana@ejemplo.cl',
    password: 'clave-segura',
    slug: 'ana-perez',
  };
  const bruno = {
    name: 'Bruno Díaz',
    email: 'bruno@ejemplo.cl',
    password: 'clave-segura',
    slug: 'bruno-diaz',
  };

  // Registra al profesional y devuelve su cookie de sesión lista para el header Cookie.
  const registerAndLogin = async (professional: typeof ana) => {
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
  };

  const postService = (cookie: string, body: object) =>
    request(app.getHttpServer())
      .post('/api/services')
      .set('Cookie', cookie)
      .send(body);

  const listServices = (cookie: string) =>
    request(app.getHttpServer()).get('/api/services').set('Cookie', cookie);

  const getPublicProfile = (slug: string) =>
    request(app.getHttpServer()).get(`/api/professionals/${slug}`);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Borrar a los profesionales borra sus servicios en cascada.
    await prisma.professional.deleteMany();
    anaCookie = await registerAndLogin(ana);
    brunoCookie = await registerAndLogin(bruno);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea «Consulta» de 60 minutos y queda activo', async () => {
    const response = await postService(anaCookie, {
      name: '  Consulta  ',
      durationMinutes: 60,
    }).expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'Consulta',
      durationMinutes: 60,
      isActive: true,
    });
    const listResponse = await listServices(anaCookie).expect(200);
    expect(listResponse.body).toEqual([response.body]);
  });

  it.each([
    [
      'falta el nombre',
      { durationMinutes: 60 },
      'Ingresa el nombre del servicio.',
    ],
    [
      'el nombre está en blanco',
      { name: '   ', durationMinutes: 60 },
      'Ingresa el nombre del servicio.',
    ],
    [
      'el nombre es muy largo',
      { name: 'a'.repeat(101), durationMinutes: 60 },
      'El nombre puede tener hasta 100 caracteres.',
    ],
    [
      'falta la duración',
      { name: 'Consulta' },
      'La duración debe ser un número entero de minutos mayor que cero.',
    ],
    [
      'la duración es cero',
      { name: 'Consulta', durationMinutes: 0 },
      'La duración debe ser un número entero de minutos mayor que cero.',
    ],
    [
      'la duración es negativa',
      { name: 'Consulta', durationMinutes: -30 },
      'La duración debe ser un número entero de minutos mayor que cero.',
    ],
    [
      'la duración no es entera',
      { name: 'Consulta', durationMinutes: 45.5 },
      'La duración debe ser un número entero de minutos mayor que cero.',
    ],
    [
      'la duración es texto',
      { name: 'Consulta', durationMinutes: 'sesenta' },
      'La duración debe ser un número entero de minutos mayor que cero.',
    ],
    [
      'la duración pasa de un día',
      { name: 'Consulta', durationMinutes: 1441 },
      'La duración puede ser de hasta 1440 minutos.',
    ],
  ])('rechaza cuando %s', async (_case, body, message) => {
    await postService(anaCookie, body)
      .expect(400)
      .expect(({ body: errorBody }) => expect(errorBody.message).toBe(message));

    expect(await prisma.service.count()).toBe(0);
  });

  it('sin sesión no deja crear ni listar servicios', async () => {
    await request(app.getHttpServer())
      .post('/api/services')
      .send({ name: 'Consulta', durationMinutes: 60 })
      .expect(401);
    await request(app.getHttpServer()).get('/api/services').expect(401);
  });

  it('cada profesional ve solo sus servicios, aunque el body nombre a otro (I1)', async () => {
    const brunoProfessional = await prisma.professional.findUniqueOrThrow({
      where: { slug: 'bruno-diaz' },
    });
    await postService(anaCookie, {
      name: 'Consulta',
      durationMinutes: 60,
      professionalId: brunoProfessional.id,
    }).expect(201);
    await postService(brunoCookie, {
      name: 'Asesoría',
      durationMinutes: 45,
    }).expect(201);

    const anaServices = await listServices(anaCookie).expect(200);
    const brunoServices = await listServices(brunoCookie).expect(200);

    expect(anaServices.body.map(({ name }: { name: string }) => name)).toEqual([
      'Consulta',
    ]);
    expect(
      brunoServices.body.map(({ name }: { name: string }) => name),
    ).toEqual(['Asesoría']);
  });

  it('la página pública de un profesional sin servicios activos no ofrece servicios', async () => {
    const response = await getPublicProfile('ana-perez').expect(200);

    expect(response.body).toEqual({
      name: 'Ana Pérez',
      slug: 'ana-perez',
      services: [],
    });
  });

  it('la página pública muestra solo los servicios activos y nada privado (I2)', async () => {
    await postService(anaCookie, {
      name: 'Consulta',
      durationMinutes: 60,
    }).expect(201);
    const pausedService = await postService(anaCookie, {
      name: 'Evaluación',
      durationMinutes: 90,
    }).expect(201);
    await prisma.service.update({
      where: { id: pausedService.body.id },
      data: { isActive: false },
    });

    const response = await getPublicProfile('ana-perez').expect(200);

    expect(response.body).toEqual({
      name: 'Ana Pérez',
      slug: 'ana-perez',
      services: [
        { id: expect.any(String), name: 'Consulta', durationMinutes: 60 },
      ],
    });
  });

  it('responde 404 si el slug no existe', async () => {
    await getPublicProfile('no-existe').expect(404);
  });
});
