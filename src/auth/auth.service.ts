import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SessionPayload } from './session.js';

// Mismo mensaje para correo desconocido y clave incorrecta: no revela cuál falló.
const INVALID_CREDENTIALS_MESSAGE = 'Correo o clave incorrectos.';

@Injectable()
export class AuthService {
  // Se verifica contra este hash cuando el correo no existe, para que ambos casos tarden lo mismo.
  private readonly timingEqualizerHash = argon2.hash('timing-equalizer');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createSessionToken({ email, password }: LoginDto): Promise<string> {
    const professional = await this.prisma.professional.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
    const passwordHash =
      professional?.passwordHash ?? (await this.timingEqualizerHash);
    const isPasswordValid = await argon2.verify(passwordHash, password);
    if (!professional || !isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const sessionPayload: SessionPayload = { sub: professional.id };
    return this.jwtService.signAsync(sessionPayload);
  }

  async findSessionProfessional(professionalId: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, name: true, email: true, slug: true, timezone: true },
    });
    // La cuenta pudo borrarse después de emitir el token.
    if (!professional) {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }
    return professional;
  }
}
