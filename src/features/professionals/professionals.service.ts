import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '../../db/generated/prisma/client.js';
import { PrismaService } from '../../db/prisma/prisma.service.js';
import type { RegisterProfessionalDto } from './dto/register-professional.dto.js';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerProfessional({
    name,
    email,
    password,
    slug,
  }: RegisterProfessionalDto) {
    // Chequeo previo para dar un mensaje preciso; la restricción única de la base sigue siendo la verdad.
    const conflictingProfessionals = await this.prisma.professional.findMany({
      where: { OR: [{ email }, { slug }] },
      select: { email: true },
    });
    if (
      conflictingProfessionals.some(
        (professional) => professional.email === email,
      )
    ) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    if (conflictingProfessionals.length > 0)
      throw new ConflictException('Ese slug ya está en uso');

    try {
      return await this.prisma.professional.create({
        data: { name, email, slug, passwordHash: await argon2.hash(password) },
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
          timezone: true,
        },
      });
    } catch (error) {
      // Dos registros simultáneos con el mismo correo o slug: gana uno, el otro recibe 409.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese correo o ese slug ya están en uso');
      }
      throw error;
    }
  }

  // Solo el perfil y los servicios activos: la superficie pública no expone nada más (I2).
  async findPublicProfile(slug: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        services: {
          where: { isActive: true },
          select: { id: true, name: true, durationMinutes: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!professional) {
      throw new NotFoundException('No encontramos esta página.');
    }
    return professional;
  }
}
