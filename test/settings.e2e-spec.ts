import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';
import { ana, bruno, registerAndLogin } from './professional-session.js';

// H2.1 — Configurar el plazo de confirmación
describe('Configuración del profesional (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let anaCookie: string;
  let brunoCookie: string;

  const getSettings = (cookie: string) =>
    request(app.getHttpServer()).get('/api/settings').set('Cookie', cookie);

  const putSettings = (cookie: string, body: object) =>
    request(app.getHttpServer())
      .put('/api/settings')
      .set('Cookie', cookie)
      .send(body);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.professional.deleteMany();
    anaCookie = await registerAndLogin(app, ana);
    brunoCookie = await registerAndLogin(app, bruno);
  });

  afterAll(async () => {
    await app.close();
  });

  it('un profesional recién registrado tiene 24 horas de plazo', async () => {
    const response = await getSettings(anaCookie).expect(200);

    expect(response.body).toEqual({ confirmationDeadlineHours: 24 });
  });

  it('Ana cambia su plazo a 48 horas sin tocar el de Bruno (I1)', async () => {
    await putSettings(anaCookie, { confirmationDeadlineHours: 48 })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toEqual({ confirmationDeadlineHours: 48 }),
      );

    expect((await getSettings(anaCookie)).body).toEqual({
      confirmationDeadlineHours: 48,
    });
    expect((await getSettings(brunoCookie)).body).toEqual({
      confirmationDeadlineHours: 24,
    });
  });

  it.each([
    [
      'falta el plazo',
      {},
      'El plazo debe ser un número entero de horas mayor que cero.',
    ],
    [
      'el plazo no es entero',
      { confirmationDeadlineHours: 1.5 },
      'El plazo debe ser un número entero de horas mayor que cero.',
    ],
    [
      'el plazo es cero',
      { confirmationDeadlineHours: 0 },
      'El plazo debe ser un número entero de horas mayor que cero.',
    ],
    [
      'el plazo pasa de 720 horas',
      { confirmationDeadlineHours: 721 },
      'El plazo puede ser de hasta 720 horas.',
    ],
  ])('rechaza el cambio cuando %s', async (_case, settings, message) => {
    await putSettings(anaCookie, settings)
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe(message));

    expect((await getSettings(anaCookie)).body).toEqual({
      confirmationDeadlineHours: 24,
    });
  });

  it('sin sesión no se lee ni se cambia la configuración', async () => {
    await request(app.getHttpServer()).get('/api/settings').expect(401);
    await request(app.getHttpServer())
      .put('/api/settings')
      .send({ confirmationDeadlineHours: 48 })
      .expect(401);
  });
});
