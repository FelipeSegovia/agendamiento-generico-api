import { TZDate } from '@date-fns/tz';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { addDays, format } from 'date-fns';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';

// H1.5 — Ver los cupos libres de un profesional
describe('Cupos públicos de un profesional (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let anaServiceId: string;
  let brunoServiceId: string;

  // Una semana completa en el futuro: las horas pasadas de hoy no afectan el resultado.
  const nextWeek = format(
    addDays(TZDate.tz('America/Santiago'), 7),
    'yyyy-MM-dd',
  );

  const getSlots = (slug: string, query: Record<string, string>) =>
    request(app.getHttpServer())
      .get(`/api/professionals/${slug}/slots`)
      .query(query);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Borrar a los profesionales borra sus servicios y rangos en cascada.
    await prisma.professional.deleteMany();
    const ana = await prisma.professional.create({
      data: {
        name: 'Ana Pérez',
        email: 'ana@ejemplo.cl',
        passwordHash: 'sin-uso',
        slug: 'ana-perez',
        services: { create: { name: 'Consulta', durationMinutes: 60 } },
        // Todos los días de 09:00 a 12:00.
        weeklyTemplateRanges: {
          create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
            weekday,
            startTime: '09:00',
            endTime: '12:00',
          })),
        },
      },
      include: { services: true },
    });
    anaServiceId = ana.services[0].id;
    const bruno = await prisma.professional.create({
      data: {
        name: 'Bruno Díaz',
        email: 'bruno@ejemplo.cl',
        passwordHash: 'sin-uso',
        slug: 'bruno-diaz',
        services: { create: { name: 'Asesoría', durationMinutes: 45 } },
      },
      include: { services: true },
    });
    brunoServiceId = bruno.services[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('muestra 7 días de cupos libres en la zona del profesional, sin datos privados (I2)', async () => {
    const response = await getSlots('ana-perez', {
      serviceId: anaServiceId,
      from: nextWeek,
    }).expect(200);

    expect(Object.keys(response.body).sort()).toEqual([
      'days',
      'from',
      'nextFrom',
      'previousFrom',
      'timezone',
    ]);
    expect(response.body.timezone).toBe('America/Santiago');
    expect(response.body.from).toBe(nextWeek);
    expect(response.body.days).toHaveLength(7);
    expect(response.body.days[0]).toEqual({
      date: nextWeek,
      slots: [
        { startsAt: expect.any(String), time: '09:00' },
        { startsAt: expect.any(String), time: '10:00' },
        { startsAt: expect.any(String), time: '11:00' },
      ],
    });
  });

  it('sin fecha parte desde hoy', async () => {
    const response = await getSlots('ana-perez', {
      serviceId: anaServiceId,
    }).expect(200);

    expect(response.body.from).toBe(
      format(TZDate.tz('America/Santiago'), 'yyyy-MM-dd'),
    );
    expect(response.body.previousFrom).toBeNull();
  });

  it('un día sin rangos no muestra cupos', async () => {
    const response = await getSlots('bruno-diaz', {
      serviceId: brunoServiceId,
      from: nextWeek,
    }).expect(200);

    expect(response.body.days).toEqual([]);
  });

  it('responde 404 si el slug no existe', async () => {
    await getSlots('no-existe', { serviceId: anaServiceId }).expect(404);
  });

  it('no muestra cupos de un servicio de otro profesional (I1)', async () => {
    await getSlots('ana-perez', { serviceId: brunoServiceId })
      .expect(404)
      .expect(({ body }) =>
        expect(body.message).toBe('No encontramos este servicio.'),
      );
  });

  it('no muestra cupos de un servicio inactivo', async () => {
    await prisma.service.update({
      where: { id: anaServiceId },
      data: { isActive: false },
    });

    await getSlots('ana-perez', { serviceId: anaServiceId }).expect(404);
  });

  it('rechaza cuando falta el servicio', async () => {
    await getSlots('ana-perez', { from: nextWeek })
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe('Elige un servicio.'));
  });

  it.each([
    [
      'el servicio no es un id',
      { serviceId: 'consulta' },
      'Elige un servicio.',
    ],
    ['la fecha no existe', { from: '2026-02-30' }, 'La fecha no es válida.'],
    [
      'la fecha trae hora',
      { from: '2026-11-09T10:00:00Z' },
      'La fecha no es válida.',
    ],
  ])('rechaza cuando %s', async (_case, query, message) => {
    await getSlots('ana-perez', { serviceId: anaServiceId, ...query })
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe(message));
  });
});
