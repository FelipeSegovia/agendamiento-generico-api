import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../../utils/dto-transforms.js';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(50, { message: 'Ingresa un correo válido.' })
  email: string;

  @IsString({ message: 'Ingresa tu clave.' })
  @IsNotEmpty({ message: 'Ingresa tu clave.' })
  // El largo máximo solo evita hashear textos enormes; el mensaje no da pistas.
  @MaxLength(70, { message: 'Correo o clave incorrectos.' })
  password: string;
}
