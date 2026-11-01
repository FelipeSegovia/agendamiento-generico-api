import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller.js';
import { ProfessionalsService } from './professionals.service.js';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService],
})
export class ProfessionalsModule {}
