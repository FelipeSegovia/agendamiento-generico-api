import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service.js';
import { slotsWeek } from '../../utils/slots/slots-week.js';
import type { SlotsQueryDto } from './dto/slots-query.dto.js';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  // Todo lo que define los cupos de un servicio (plantilla, duración, zona y citas activas) y el plazo para reservar.
  async loadSchedule(slug: string, serviceId: string, now: Date) {
    const professional = await this.prisma.professional.findUnique({
      where: { slug },
      select: {
        id: true,
        timezone: true,
        confirmationDeadlineHours: true,
        // Un servicio de otro profesional o inactivo no se encuentra.
        services: {
          where: { id: serviceId, isActive: true },
          select: { durationMinutes: true },
        },
        weeklyTemplateRanges: {
          select: { weekday: true, startTime: true, endTime: true },
          orderBy: { startTime: 'asc' },
        },
        appointments: {
          where: {
            status: { in: ['pending', 'confirmed'] },
            endsAt: { gt: now },
          },
          select: { startsAt: true, endsAt: true },
        },
      },
    });
    if (!professional) {
      throw new NotFoundException('No encontramos esta página.');
    }
    const [service] = professional.services;
    if (!service) {
      throw new NotFoundException('No encontramos este servicio.');
    }
    return {
      professionalId: professional.id,
      timezone: professional.timezone,
      confirmationDeadlineHours: professional.confirmationDeadlineHours,
      durationMinutes: service.durationMinutes,
      ranges: professional.weeklyTemplateRanges,
      busyIntervals: professional.appointments,
    };
  }

  // Solo horas libres y la zona del profesional: la superficie pública no expone nada más (I2).
  async findSlotsWeek(slug: string, { serviceId, from }: SlotsQueryDto) {
    const now = new Date();
    const { timezone, durationMinutes, ranges, busyIntervals } =
      await this.loadSchedule(slug, serviceId, now);
    return {
      timezone,
      ...slotsWeek({
        ranges,
        busyIntervals,
        durationMinutes,
        timezone,
        now,
        from,
      }),
    };
  }
}
