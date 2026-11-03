import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  // ProfessionalSessionGuard necesita el JwtService que exporta AuthModule.
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
