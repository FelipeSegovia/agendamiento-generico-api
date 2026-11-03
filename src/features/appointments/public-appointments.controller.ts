import { Body, Controller, Param, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { BookAppointmentDto } from './dto/book-appointment.dto.js';

// Ruta pública: la usa el formulario de reserva de /profesional/:slug, sin sesión.
@Controller('api/professionals/:slug/appointments')
export class PublicAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  bookAppointment(
    @Param('slug') slug: string,
    @Body() booking: BookAppointmentDto,
  ) {
    return this.appointments.bookAppointment(slug, booking);
  }
}
