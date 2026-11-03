import { Controller, Get, Param, Query } from '@nestjs/common';
import { SlotsQueryDto } from './dto/slots-query.dto.js';
import { SlotsService } from './slots.service.js';

// Ruta pública: la usa la página /profesional/:slug, sin sesión.
@Controller('api/professionals/:slug/slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  findSlotsWeek(@Param('slug') slug: string, @Query() query: SlotsQueryDto) {
    return this.slots.findSlotsWeek(slug, query);
  }
}
