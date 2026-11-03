import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RegisterProfessionalDto } from './dto/register-professional.dto.js';
import { ProfessionalsService } from './professionals.service.js';

@Controller('api/professionals')
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Post()
  registerProfessional(@Body() registration: RegisterProfessionalDto) {
    return this.professionals.registerProfessional(registration);
  }

  // Ruta pública: la usa la página /profesional/:slug, sin sesión.
  @Get(':slug')
  findPublicProfile(@Param('slug') slug: string) {
    return this.professionals.findPublicProfile(slug);
  }
}
