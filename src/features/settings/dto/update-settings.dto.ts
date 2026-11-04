import { IsInt, Max, Min } from 'class-validator';

const DEADLINE_MESSAGE =
  'El plazo debe ser un número entero de horas mayor que cero.';

// Los decoradores se validan de abajo hacia arriba: la regla más básica va abajo.
export class UpdateSettingsDto {
  // Treinta días: más allá, toda reserva nacería confirmada dentro del horizonte.
  @Max(720, { message: 'El plazo puede ser de hasta 720 horas.' })
  @Min(1, { message: DEADLINE_MESSAGE })
  @IsInt({ message: DEADLINE_MESSAGE })
  confirmationDeadlineHours: number;
}
