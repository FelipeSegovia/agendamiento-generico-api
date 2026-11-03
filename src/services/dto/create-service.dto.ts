import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Si el valor no es texto, se deja tal cual para que lo rechace la validación.
const trimText = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value;

const DURATION_MESSAGE =
  'La duración debe ser un número entero de minutos mayor que cero.';

// Los decoradores se validan de abajo hacia arriba, y el pipe muestra solo el primer
// mensaje: la regla más básica va abajo, junto a la propiedad.
export class CreateServiceDto {
  @Transform(trimText)
  @MaxLength(100, { message: 'El nombre puede tener hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'Ingresa el nombre del servicio.' })
  @IsString({ message: 'Ingresa el nombre del servicio.' })
  name: string;

  // Un cupo tiene que caber dentro de un día.
  @Max(1440, { message: 'La duración puede ser de hasta 1440 minutos.' })
  @Min(1, { message: DURATION_MESSAGE })
  @IsInt({ message: DURATION_MESSAGE })
  durationMinutes: number;
}
