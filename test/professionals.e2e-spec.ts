import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import * as argon2 from 'argon2';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';

// H1.1 — Registrarme como profesional
describe('Registro de profesional (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const validRegistration = {
    name: 'Ana Pérez',
    email: 'ana@ejemplo.cl',
    password: 'clave-segura',
    slug: 'ana-perez',
  };

  const postRegistration = (body: object) =>
    request(app.getHttpServer()).post('/api/professionals').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.professional.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea la cuenta con zona America/Santiago y guarda la clave con hash', async () => {
    const response = await postRegistration(validRegistration).expect(201);

    expect(response.body).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@ejemplo.cl',
      slug: 'ana-perez',
      timezone: 'America/Santiago',
    });
    const professional = await prisma.professional.findUniqueOrThrow({
      where: { slug: 'ana-perez' },
    });
    expect(professional.passwordHash).not.toBe('clave-segura');
    expect(await argon2.verify(professional.passwordHash, 'clave-segura')).toBe(
      true,
    );
  });

  it('rechaza un correo ya registrado, también si cambia de mayúsculas', async () => {
    await postRegistration(validRegistration).expect(201);

    await postRegistration({
      ...validRegistration,
      slug: 'otra-ana',
      email: 'ANA@ejemplo.cl',
    })
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe('Ya existe una cuenta con ese correo'),
      );
    expect(await prisma.professional.count()).toBe(1);
  });

  it('rechaza una clave de menos de 8 caracteres', async () => {
    await postRegistration({
      ...validRegistration,
      password: 'corta-7',
    }).expect(400);

    expect(await prisma.professional.count()).toBe(0);
  });

  it('rechaza un slug ya ocupado y pide otro', async () => {
    await postRegistration(validRegistration).expect(201);

    await postRegistration({ ...validRegistration, email: 'bruno@ejemplo.cl' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe('Ese slug ya está en uso'),
      );
  });

  it.each(['Ana-Perez', 'ana perez', 'ana_perez', 'ana.perez', 'ana/perez'])(
    'rechaza el slug inválido «%s»',
    async (slug) => {
      await postRegistration({ ...validRegistration, slug }).expect(400);

      expect(await prisma.professional.count()).toBe(0);
    },
  );

  it('rechaza el registro sin nombre', async () => {
    await postRegistration({ ...validRegistration, name: '   ' })
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe('Ingresa tu nombre.'));
  });

  it.each([
    ['name', 'a'.repeat(101), 'El nombre puede tener hasta 100 caracteres.'],
    ['email', `${'a'.repeat(46)}@x.cl`, 'Ingresa un correo válido.'],
    ['password', 'a'.repeat(71), 'La clave puede tener hasta 70 caracteres.'],
    [
      'slug',
      'a'.repeat(61),
      'La dirección de tu página puede tener hasta 60 caracteres.',
    ],
  ])(
    'rechaza un %s más largo que el máximo',
    async (field, tooLongValue, expectedMessage) => {
      await postRegistration({ ...validRegistration, [field]: tooLongValue })
        .expect(400)
        .expect(({ body }) => expect(body.message).toBe(expectedMessage));

      expect(await prisma.professional.count()).toBe(0);
    },
  );

  it('acepta los valores en el largo máximo', async () => {
    await postRegistration({
      name: 'a'.repeat(100),
      email: `${'a'.repeat(45)}@x.cl`,
      password: 'a'.repeat(70),
      slug: 'a'.repeat(60),
    }).expect(201);
  });

  it('deja una sola cuenta si dos registros con el mismo correo llegan a la vez', async () => {
    const responses = await Promise.all([
      postRegistration(validRegistration),
      postRegistration({ ...validRegistration, slug: 'otra-ana' }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await prisma.professional.count()).toBe(1);
  });
});
