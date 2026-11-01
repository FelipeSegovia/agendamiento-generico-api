import { Body, Controller, Post } from '@nestjs/common';
import { RegisterProfessionalDto } from './dto/register-professional.dto.js';
import { ProfessionalsService } from './professionals.service.js';

@Controller('api/professionals')
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Post()
  registerProfessional(@Body() registration: RegisterProfessionalDto) {
    return this.professionals.registerProfessional(registration);
  }
}
