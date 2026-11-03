import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SlotsModule } from '../slots/slots.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { PublicAppointmentsController } from './public-appointments.controller.js';

@Module({
  // ProfessionalSessionGuard necesita el JwtService que exporta AuthModule.
  imports: [AuthModule, SlotsModule],
  controllers: [PublicAppointmentsController, AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
