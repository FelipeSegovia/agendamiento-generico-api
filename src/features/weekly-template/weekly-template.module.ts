import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WeeklyTemplateController } from './weekly-template.controller.js';
import { WeeklyTemplateService } from './weekly-template.service.js';

@Module({
  // ProfessionalSessionGuard necesita el JwtService que exporta AuthModule.
  imports: [AuthModule],
  controllers: [WeeklyTemplateController],
  providers: [WeeklyTemplateService],
})
export class WeeklyTemplateModule {}
