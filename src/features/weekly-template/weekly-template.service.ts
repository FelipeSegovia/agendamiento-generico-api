import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service.js';
import type { WeeklyTemplateRangeDto } from './dto/replace-weekly-template.dto.js';

const rangeFields = {
  id: true,
  weekday: true,
  startTime: true,
  endTime: true,
} as const;

const WEEKDAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

// Las horas «HH:mm» con dos dígitos se comparan bien como texto.
function findTemplateError(ranges: WeeklyTemplateRangeDto[]) {
  const invertedRange = ranges.find(
    (range) => range.endTime <= range.startTime,
  );
  if (invertedRange) {
    return `El ${WEEKDAY_NAMES[invertedRange.weekday]} tiene un rango que termina antes de empezar.`;
  }
  const sortedRanges = [...ranges].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );
  // Rangos contiguos (09:00–11:00 y 11:00–13:00) no se solapan.
  const overlappingRange = sortedRanges.find((range, index) => {
    const previousRange = sortedRanges[index - 1];
    return (
      previousRange?.weekday === range.weekday &&
      range.startTime < previousRange.endTime
    );
  });
  if (overlappingRange) {
    return `El ${WEEKDAY_NAMES[overlappingRange.weekday]} tiene rangos que se solapan.`;
  }
}

@Injectable()
export class WeeklyTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  listRanges(professionalId: string) {
    return this.prisma.weeklyTemplateRange.findMany({
      where: { professionalId },
      select: rangeFields,
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async replaceRanges(
    professionalId: string,
    ranges: WeeklyTemplateRangeDto[],
  ) {
    const templateError = findTemplateError(ranges);
    if (templateError) throw new BadRequestException(templateError);

    await this.prisma.$transaction(async (transaction) => {
      // Bloquea al profesional: dos guardados simultáneos se aplican uno tras otro y no mezclan rangos.
      await transaction.$queryRaw`SELECT 1 FROM "Professional" WHERE id = ${professionalId} FOR UPDATE`;
      await transaction.weeklyTemplateRange.deleteMany({
        where: { professionalId },
      });
      await transaction.weeklyTemplateRange.createMany({
        data: ranges.map(({ weekday, startTime, endTime }) => ({
          professionalId,
          weekday,
          startTime,
          endTime,
        })),
      });
    });
    return this.listRanges(professionalId);
  }
}
