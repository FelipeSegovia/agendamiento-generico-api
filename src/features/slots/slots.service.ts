import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service.js';
import { slotsWeek } from '../../utils/slots/slots-week.js';
import type { SlotsQueryDto } from './dto/slots-query.dto.js';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  // Solo horas libres y la zona del profesional: la superficie pública no expone nada más (I2).
  async findSlotsWeek(slug: string, { serviceId, from }: SlotsQueryDto) {
    const professional = await this.prisma.professional.findUnique({
      where: { slug },
      select: {
        timezone: true,
        // Un servicio de otro profesional o inactivo no se encuentra.
        services: {
          where: { id: serviceId, isActive: true },
          select: { durationMinutes: true },
        },
        weeklyTemplateRanges: {
          select: { weekday: true, startTime: true, endTime: true },
          orderBy: { startTime: 'asc' },
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
      timezone: professional.timezone,
      ...slotsWeek({
        ranges: professional.weeklyTemplateRanges,
        durationMinutes: service.durationMinutes,
        timezone: professional.timezone,
        now: new Date(),
        from,
      }),
    };
  }
}
