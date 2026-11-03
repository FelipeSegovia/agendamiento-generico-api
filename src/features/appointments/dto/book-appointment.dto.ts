import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { normalizeEmail, trimText } from '../../../utils/dto-transforms.js';

// Reserva desde la página pública. Los mensajes dicen qué falta, en el lenguaje del formulario.
export class BookAppointmentDto {
  @IsUUID('all', { message: 'Elige un servicio.' })
  serviceId: string;

  // Instante exacto del cupo, tal como lo entrega la ruta de cupos.
  @IsISO8601({ strict: true }, { message: 'Elige una hora.' })
  startsAt: string;

  @Transform(trimText)
  @MaxLength(100, { message: 'El nombre puede tener hasta 100 caracteres.' })
  @IsNotEmpty({ message: 'Ingresa tu nombre.' })
  @IsString({ message: 'Ingresa tu nombre.' })
  name: string;

  @Transform(normalizeEmail)
  @MaxLength(100, { message: 'Ingresa un correo válido.' })
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @IsNotEmpty({ message: 'Ingresa tu correo.' })
  @IsString({ message: 'Ingresa tu correo.' })
  email: string;

  // Dígitos con +, espacios, guiones o paréntesis opcionales: «+56 9 1234 5678».
  @Transform(trimText)
  @Matches(/^\+?[\d\s()-]{8,20}$/, { message: 'Ingresa un teléfono válido.' })
  @IsNotEmpty({ message: 'Ingresa tu teléfono.' })
  @IsString({ message: 'Ingresa tu teléfono.' })
  phone: string;
}
