import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller.js';
import { SlotsService } from './slots.service.js';

@Module({
  controllers: [SlotsController],
  providers: [SlotsService],
  // La reserva valida el cupo con el mismo cálculo que ve el cliente.
  exports: [SlotsService],
})
export class SlotsModule {}
