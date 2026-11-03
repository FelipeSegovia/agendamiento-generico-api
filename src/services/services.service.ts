import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';

const serviceFields = {
  id: true,
  name: true,
  durationMinutes: true,
  isActive: true,
} as const;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // Un servicio nuevo nace activo (valor por defecto del esquema).
  createService(
    professionalId: string,
    { name, durationMinutes }: CreateServiceDto,
  ) {
    return this.prisma.service.create({
      data: { professionalId, name, durationMinutes },
      select: serviceFields,
    });
  }

  listServices(professionalId: string) {
    return this.prisma.service.findMany({
      where: { professionalId },
      select: serviceFields,
      orderBy: { name: 'asc' },
    });
  }
}
