import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentProfessionalId } from '../auth/current-professional-id.decorator.js';
import { ProfessionalSessionGuard } from '../auth/professional-session.guard.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { ServicesService } from './services.service.js';

@Controller('api/services')
@UseGuards(ProfessionalSessionGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  createService(
    @CurrentProfessionalId() professionalId: string,
    @Body() service: CreateServiceDto,
  ) {
    return this.services.createService(professionalId, service);
  }

  @Get()
  listServices(@CurrentProfessionalId() professionalId: string) {
    return this.services.listServices(professionalId);
  }
}
