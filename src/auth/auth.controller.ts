import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import { CurrentProfessionalId } from './current-professional-id.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { ProfessionalSessionGuard } from './professional-session.guard.js';
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from './session.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(204)
  async login(
    @Body() credentials: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply, //passthrough se usa siempre y cuando solo se necesite tocar el header o cookies
  ): Promise<void> {
    const sessionToken = await this.auth.createSessionToken(credentials);
    reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });
  }

  @Get('me')
  @UseGuards(ProfessionalSessionGuard)
  getSessionProfessional(@CurrentProfessionalId() professionalId: string) {
    return this.auth.findSessionProfessional(professionalId);
  }
}
