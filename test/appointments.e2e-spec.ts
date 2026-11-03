import { TZDate } from '@date-fns/tz';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { addDays, format } from 'date-fns';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';
import { ana, bruno, registerAndLogin } from './professional-session.js';

type SlotsWeekResponse = {
  days: { date: string; slots: { startsAt: string; time: string }[] }[];
};

// H1.6 — Reservar un cupo
describe('Reserva de un cupo (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let anaCookie: string;
  let brunoCookie: string;
  let consultaId: string;
  let brunoServiceId: string;

  // Una semana completa en el futuro: las horas pasadas de hoy no afectan el resultado.
  const nextWeek = format(
    addDays(TZDate.tz('America/Santiago'), 7),
    'yyyy-MM-dd',
  );

  const carla = {
    name: 'Carla Soto',
    email: 'carla@ejemplo.cl',
    phone: '+56 9 1234 5678',
  };

  const getSlots = async () => {
    const response = await request(app.getHttpServer())
      .get('/api/professionals/ana-perez/slots')
      .query({ serviceId: consultaId, from: nextWeek })
      .expect(200);
    const week: SlotsWeekResponse = response.body;
    return week.days[0].slots;
  };

  // El instante del cupo de ese día a la hora dada, tal como lo ofrece la página.
  const slotAt = async (time: string) => {
    const slot = (await getSlots()).find((daySlot) => daySlot.time === time);
    if (!slot) throw new Error(`No hay cupo a las ${time}.`);
    return slot.startsAt;
  };

  const book = (body: object, slug = 'ana-perez') =>
    request(app.getHttpServer())
      .post(`/api/professionals/${slug}/appointments`)
      .send(body);

  const listAppointments = (cookie: string) =>
    request(app.getHttpServer()).get('/api/appointments').set('Cookie', cookie);

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Borrar a los profesionales borra sus servicios, rangos, clientes y citas en cascada.
    await prisma.professional.deleteMany();
    anaCookie = await registerAndLogin(app, ana);
    brunoCookie = await registerAndLogin(app, bruno);
    const anaProfessional = await prisma.professional.update({
      where: { slug: 'ana-perez' },
      data: {
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
    consultaId = anaProfessional.services[0].id;
    const brunoProfessional = await prisma.professional.update({
      where: { slug: 'bruno-diaz' },
      data: { services: { create: { name: 'Asesoría', durationMinutes: 45 } } },
      include: { services: true },
    });
    brunoServiceId = brunoProfessional.services[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('reserva el cupo de las 10:00: la cita dura lo que el servicio, nace confirmada y el cupo desaparece', async () => {
    const startsAt = await slotAt('10:00');

    const response = await book({
      serviceId: consultaId,
      startsAt,
      ...carla,
    }).expect(201);

    // Solo datos de la propia reserva: nada de otros clientes (I2).
    expect(response.body).toEqual({
      startsAt,
      endsAt: new Date(Date.parse(startsAt) + 60 * 60_000).toISOString(),
      status: 'confirmed',
      service: { name: 'Consulta' },
    });
    expect((await getSlots()).map(({ time }) => time)).toEqual([
      '09:00',
      '11:00',
    ]);
  });

  it('la agenda del panel muestra la cita con su servicio, su hora y el cliente', async () => {
    const startsAt = await slotAt('10:00');
    await book({ serviceId: consultaId, startsAt, ...carla }).expect(201);

    const response = await listAppointments(anaCookie).expect(200);

    expect(response.body).toEqual([
      {
        id: expect.any(String),
        startsAt,
        endsAt: new Date(Date.parse(startsAt) + 60 * 60_000).toISOString(),
        status: 'confirmed',
        service: { name: 'Consulta' },
        client: carla,
      },
    ]);
  });

  it.each([
    ['falta el nombre', { name: undefined }, 'Ingresa tu nombre.'],
    ['el nombre está en blanco', { name: '   ' }, 'Ingresa tu nombre.'],
    ['falta el correo', { email: undefined }, 'Ingresa tu correo.'],
    [
      'el correo no es válido',
      { email: 'carla@' },
      'Ingresa un correo válido.',
    ],
    ['falta el teléfono', { phone: undefined }, 'Ingresa tu teléfono.'],
    [
      'el teléfono no es válido',
      { phone: 'abc' },
      'Ingresa un teléfono válido.',
    ],
  ])('rechaza la reserva cuando %s', async (_case, override, message) => {
    const startsAt = await slotAt('10:00');

    await book({ serviceId: consultaId, startsAt, ...carla, ...override })
      .expect(400)
      .expect(({ body }) => expect(body.message).toBe(message));

    expect(await prisma.appointment.count()).toBe(0);
  });

  it('rechaza un cupo que otro cliente ya reservó y pide elegir otro', async () => {
    const startsAt = await slotAt('10:00');
    await book({ serviceId: consultaId, startsAt, ...carla }).expect(201);

    await book({
      serviceId: consultaId,
      startsAt,
      name: 'Diego Rojas',
      email: 'diego@ejemplo.cl',
      phone: '+56 9 8765 4321',
    })
      .expect(409)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'Ese horario ya no está disponible. Elige otro.',
        ),
      );
  });

  it('de dos reservas simultáneas del mismo cupo, solo una se crea (I3)', async () => {
    const startsAt = await slotAt('10:00');

    const responses = await Promise.all([
      book({ serviceId: consultaId, startsAt, ...carla }),
      book({
        serviceId: consultaId,
        startsAt,
        name: 'Diego Rojas',
        email: 'diego@ejemplo.cl',
        phone: '+56 9 8765 4321',
      }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it('rechaza una hora que la página no ofrece', async () => {
    const tenAm = await slotAt('10:00');
    // 10:30 no calza con la plantilla, y una hora pasada ya no se ofrece.
    for (const startsAt of [
      new Date(Date.parse(tenAm) + 30 * 60_000).toISOString(),
      new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    ]) {
      await book({ serviceId: consultaId, startsAt, ...carla }).expect(409);
    }
    expect(await prisma.appointment.count()).toBe(0);
  });

  it('no reserva un servicio de otro profesional ni en un slug inexistente (I1)', async () => {
    const startsAt = await slotAt('10:00');

    await book({ serviceId: brunoServiceId, startsAt, ...carla }).expect(404);
    await book(
      { serviceId: consultaId, startsAt, ...carla },
      'no-existe',
    ).expect(404);
  });

  it('un correo ya registrado con el profesional conserva el nombre y el teléfono guardados', async () => {
    await book({
      serviceId: consultaId,
      startsAt: await slotAt('09:00'),
      ...carla,
    }).expect(201);

    await book({
      serviceId: consultaId,
      startsAt: await slotAt('11:00'),
      name: 'Carla S.',
      email: '  CARLA@ejemplo.cl ',
      phone: '+56 2 2222 2222',
    }).expect(201);

    const clients = await prisma.client.findMany({
      select: { name: true, email: true, phone: true },
    });
    expect(clients).toEqual([carla]);
  });

  it('cada profesional ve solo sus citas en el panel, y sin sesión no se ven (I1)', async () => {
    await book({
      serviceId: consultaId,
      startsAt: await slotAt('10:00'),
      ...carla,
    }).expect(201);

    expect((await listAppointments(brunoCookie).expect(200)).body).toEqual([]);
    await request(app.getHttpServer()).get('/api/appointments').expect(401);
  });
});
