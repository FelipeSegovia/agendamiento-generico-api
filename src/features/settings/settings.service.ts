import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service.js';
import type { UpdateSettingsDto } from './dto/update-settings.dto.js';

const settingsFields = { confirmationDeadlineHours: true } as const;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findSettings(professionalId: string) {
    return this.prisma.professional.findUniqueOrThrow({
      where: { id: professionalId },
      select: settingsFields,
    });
  }

  updateSettings(professionalId: string, settings: UpdateSettingsDto) {
    return this.prisma.professional.update({
      where: { id: professionalId },
      data: settings,
      select: settingsFields,
    });
  }
}
