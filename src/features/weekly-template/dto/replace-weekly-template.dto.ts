import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// «HH:mm» con dos dígitos, como lo entrega <input type="time">.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Completa la hora de inicio y de término de cada rango.';
const WEEKDAY_MESSAGE = 'Elige un día de la semana válido.';

export class WeeklyTemplateRangeDto {
  @Max(6, { message: WEEKDAY_MESSAGE })
  @Min(0, { message: WEEKDAY_MESSAGE })
  @IsInt({ message: WEEKDAY_MESSAGE })
  weekday: number;

  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  startTime: string;

  @Matches(TIME_PATTERN, { message: TIME_MESSAGE })
  endTime: string;
}

// La plantilla se guarda completa: la lista reemplaza a todos los rangos anteriores.
export class ReplaceWeeklyTemplateDto {
  @ValidateNested({ each: true })
  @Type(() => WeeklyTemplateRangeDto)
  @ArrayMaxSize(100, { message: 'Puedes tener hasta 100 rangos.' })
  @IsArray({ message: 'Envía la lista de rangos.' })
  ranges: WeeklyTemplateRangeDto[];
}
