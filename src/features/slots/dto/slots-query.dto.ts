import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';

export class SlotsQueryDto {
  @IsUUID('all', { message: 'Elige un servicio.' })
  serviceId: string;

  // Fecha sin hora, en la zona del profesional.
  @IsISO8601({ strict: true }, { message: 'La fecha no es válida.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha no es válida.' })
  @IsOptional()
  from?: string;
}
