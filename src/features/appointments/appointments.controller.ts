import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentProfessionalId } from '../auth/current-professional-id.decorator.js';
import { ProfessionalSessionGuard } from '../auth/professional-session.guard.js';
import { AppointmentsService } from './appointments.service.js';

@Controller('api/appointments')
@UseGuards(ProfessionalSessionGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  listUpcomingAppointments(@CurrentProfessionalId() professionalId: string) {
    return this.appointments.listUpcomingAppointments(professionalId);
  }
}
