import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentProfessionalId } from '../auth/current-professional-id.decorator.js';
import { ProfessionalSessionGuard } from '../auth/professional-session.guard.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('api/settings')
@UseGuards(ProfessionalSessionGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  findSettings(@CurrentProfessionalId() professionalId: string) {
    return this.settings.findSettings(professionalId);
  }

  @Put()
  updateSettings(
    @CurrentProfessionalId() professionalId: string,
    @Body() settings: UpdateSettingsDto,
  ) {
    return this.settings.updateSettings(professionalId, settings);
  }
}
