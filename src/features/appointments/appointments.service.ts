import { TZDate } from '@date-fns/tz';
import { ConflictException, Injectable } from '@nestjs/common';
import { addMinutes, format } from 'date-fns';
import { Prisma } from '../../db/generated/prisma/client.js';
import { PrismaService } from '../../db/prisma/prisma.service.js';
import { initialAppointmentStatus } from '../../utils/initial-appointment-status.js';
import { slotsWeek } from '../../utils/slots/slots-week.js';
import { SlotsService } from '../slots/slots.service.js';
import type { BookAppointmentDto } from './dto/book-appointment.dto.js';

const SLOT_TAKEN_MESSAGE = 'Ese horario ya no está disponible. Elige otro.';

// Con el driver adapter, el código de Postgres viaja en meta (verificado con adapter-pg 7.10).
type DriverAdapterMeta = {
  driverAdapterError?: { cause?: { originalCode?: string } };
};

// 23P01: se violó la restricción EXCLUDE «Appointment_no_overlap» de la migración «citas».
const isOverlapViolation = (error: Prisma.PrismaClientKnownRequestError) =>
  (error.meta as DriverAdapterMeta | undefined)?.driverAdapterError?.cause
    ?.originalCode === '23P01';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotsService,
  ) {}

  async bookAppointment(
    slug: string,
    { serviceId, startsAt, name, email, phone }: BookAppointmentDto,
  ) {
    const now = new Date();
    const startDate = new Date(startsAt);
    const schedule = await this.slots.loadSchedule(slug, serviceId, now);

    // Solo se reserva un cupo que la página pública ofrecería ahora mismo.
    const week = slotsWeek({
      ...schedule,
      now,
      from: format(new TZDate(startDate, schedule.timezone), 'yyyy-MM-dd'),
    });
    const isOffered = week.days.some((day) =>
      day.slots.some((slot) => slot.startsAt === startDate.toISOString()),
    );
    if (!isOffered) throw new ConflictException(SLOT_TAKEN_MESSAGE);

    try {
      return await this.prisma.$transaction(async (transaction) => {
        // Un correo ya registrado con este profesional conserva su nombre y teléfono.
        const client = await transaction.client.upsert({
          where: {
            professionalId_email: {
              professionalId: schedule.professionalId,
              email,
            },
          },
          create: {
            professionalId: schedule.professionalId,
            name,
            email,
            phone,
          },
          update: {},
          select: { id: true },
        });
        return transaction.appointment.create({
          data: {
            professionalId: schedule.professionalId,
            clientId: client.id,
            serviceId,
            startsAt: startDate,
            endsAt: addMinutes(startDate, schedule.durationMinutes),
            status: initialAppointmentStatus(
              startDate,
              schedule.confirmationDeadlineHours,
              now,
            ),
          },
          select: {
            startsAt: true,
            endsAt: true,
            status: true,
            service: { select: { name: true } },
          },
        });
      });
    } catch (error) {
      // Otra reserva tomó el horario entre la validación y la transacción (I3).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        isOverlapViolation(error)
      ) {
        throw new ConflictException(SLOT_TAKEN_MESSAGE);
      }
      throw error;
    }
  }

  // Citas activas que aún no terminan, de la más próxima a la más lejana.
  listUpcomingAppointments(professionalId: string) {
    return this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ['pending', 'confirmed'] },
        endsAt: { gt: new Date() },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { name: true, email: true, phone: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
