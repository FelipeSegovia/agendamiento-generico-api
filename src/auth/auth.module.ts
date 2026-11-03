import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../config/env.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SESSION_DURATION_SECONDS } from './session.js';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_SECRET_PROFESSIONAL,
      signOptions: { expiresIn: SESSION_DURATION_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // Lo usan los módulos del panel para ProfessionalSessionGuard.
  exports: [JwtModule],
})
export class AuthModule {}
