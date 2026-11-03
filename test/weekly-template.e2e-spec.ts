import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';

// H1.4 — Definir mi horario semanal
describe('Plantilla semanal del profesional (e2e)', () => {
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

  const putTemplate = (cookie: string, body: object) =>
    request(app.getHttpServer())
      .put('/api/weekly-template')
      .set('Cookie', cookie)
      .send(body);

  const getTemplate = (cookie: string) =>
    request(app.getHttpServer())
      .get('/api/weekly-template')
      .set('Cookie', cookie);

  // Quita los id generados para comparar solo día y horas.
  const withoutIds = (ranges: { id: string }[]) =>
    ranges.map(({ id: _id, ...range }) => range);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Borrar a los profesionales borra sus rangos en cascada.
    await prisma.professional.deleteMany();
    anaCookie = await registerAndLogin(ana);
    brunoCookie = await registerAndLogin(bruno);
  });

  afterAll(async () => {
    await app.close();
  });

  it('guarda varios rangos en un día y los devuelve ordenados', async () => {
    const response = await putTemplate(anaCookie, {
      ranges: [
        { weekday: 3, startTime: '15:00', endTime: '17:00' },
        { weekday: 1, startTime: '09:00', endTime: '12:00' },
        { weekday: 3, startTime: '09:00', endTime: '11:00' },
      ],
    }).expect(200);

    const savedRanges = [
      { weekday: 1, startTime: '09:00', endTime: '12:00' },
      { weekday: 3, startTime: '09:00', endTime: '11:00' },
      { weekday: 3, startTime: '15:00', endTime: '17:00' },
    ];
    expect(withoutIds(response.body)).toEqual(savedRanges);
    const getResponse = await getTemplate(anaCookie).expect(200);
    expect(withoutIds(getResponse.body)).toEqual(savedRanges);
  });

  it('un guardado nuevo reemplaza toda la plantilla, y una lista vacía deja todos los días sin atención', async () => {
    await putTemplate(anaCookie, {
      ranges: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }],
    }).expect(200);
    await putTemplate(anaCookie, {
      ranges: [{ weekday: 2, startTime: '10:00', endTime: '11:00' }],
    }).expect(200);
    expect(withoutIds((await getTemplate(anaCookie)).body)).toEqual([
      { weekday: 2, startTime: '10:00', endTime: '11:00' },
    ]);

    await putTemplate(anaCookie, { ranges: [] }).expect(200);
    expect((await getTemplate(anaCookie)).body).toEqual([]);
  });

  it('acepta rangos contiguos en el mismo día', async () => {
    await putTemplate(anaCookie, {
      ranges: [
        { weekday: 1, startTime: '09:00', endTime: '11:00' },
        { weekday: 1, startTime: '11:00', endTime: '13:00' },
      ],
    }).expect(200);
  });

  it.each([
    [
      'un rango termina antes de empezar',
      [{ weekday: 1, startTime: '12:00', endTime: '09:00' }],
      'El lunes tiene un rango que termina antes de empezar.',
    ],
    [
      'un rango termina a la misma hora que empieza',
      [{ weekday: 2, startTime: '09:00', endTime: '09:00' }],
      'El martes tiene un rango que termina antes de empezar.',
    ],
    [
      'dos rangos del mismo día se solapan',
      [
        { weekday: 3, startTime: '09:00', endTime: '11:00' },
        { weekday: 3, startTime: '10:30', endTime: '12:00' },
      ],
      'El miércoles tiene rangos que se solapan.',
    ],
    [
      'falta una hora',
      [{ weekday: 1, startTime: '', endTime: '12:00' }],
      'Completa la hora de inicio y de término de cada rango.',
    ],
    [
      'una hora no tiene formato HH:mm',
      [{ weekday: 1, startTime: '9:00', endTime: '12:00' }],
      'Completa la hora de inicio y de término de cada rango.',
    ],
    [
      'el día no existe',
      [{ weekday: 7, startTime: '09:00', endTime: '12:00' }],
      'Elige un día de la semana válido.',
    ],
  ])('rechaza cuando %s', async (_case, ranges, message) => {
    await putTemplate(anaCookie, {
      ranges: [{ weekday: 5, startTime: '09:00', endTime: '10:00' }],
    }).expect(200);

    await putTemplate(anaCookie, { ranges })
      .expect(400)
      .expect(({ body: errorBody }) => expect(errorBody.message).toBe(message));

    // La plantilla anterior queda intacta.
    expect(withoutIds((await getTemplate(anaCookie)).body)).toEqual([
      { weekday: 5, startTime: '09:00', endTime: '10:00' },
    ]);
  });

  it('rechaza un body sin lista de rangos', async () => {
    await putTemplate(anaCookie, {})
      .expect(400)
      .expect(({ body: errorBody }) =>
        expect(errorBody.message).toBe('Envía la lista de rangos.'),
      );
  });

  it('sin sesión no deja ver ni guardar la plantilla', async () => {
    await request(app.getHttpServer())
      .put('/api/weekly-template')
      .send({ ranges: [] })
      .expect(401);
    await request(app.getHttpServer()).get('/api/weekly-template').expect(401);
  });

  it('cada profesional ve y reemplaza solo su plantilla, aunque el body nombre a otro (I1)', async () => {
    const brunoProfessional = await prisma.professional.findUniqueOrThrow({
      where: { slug: 'bruno-diaz' },
    });
    await putTemplate(brunoCookie, {
      ranges: [{ weekday: 4, startTime: '14:00', endTime: '18:00' }],
    }).expect(200);

    await putTemplate(anaCookie, {
      professionalId: brunoProfessional.id,
      ranges: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }],
    }).expect(200);

    expect(withoutIds((await getTemplate(anaCookie)).body)).toEqual([
      { weekday: 1, startTime: '09:00', endTime: '12:00' },
    ]);
    expect(withoutIds((await getTemplate(brunoCookie)).body)).toEqual([
      { weekday: 4, startTime: '14:00', endTime: '18:00' },
    ]);
  });
});
