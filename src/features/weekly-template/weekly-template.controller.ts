import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentProfessionalId } from '../auth/current-professional-id.decorator.js';
import { ProfessionalSessionGuard } from '../auth/professional-session.guard.js';
import { ReplaceWeeklyTemplateDto } from './dto/replace-weekly-template.dto.js';
import { WeeklyTemplateService } from './weekly-template.service.js';

@Controller('api/weekly-template')
@UseGuards(ProfessionalSessionGuard)
export class WeeklyTemplateController {
  constructor(private readonly weeklyTemplate: WeeklyTemplateService) {}

  @Get()
  listRanges(@CurrentProfessionalId() professionalId: string) {
    return this.weeklyTemplate.listRanges(professionalId);
  }

  @Put()
  replaceRanges(
    @CurrentProfessionalId() professionalId: string,
    @Body() { ranges }: ReplaceWeeklyTemplateDto,
  ) {
    return this.weeklyTemplate.replaceRanges(professionalId, ranges);
  }
}
