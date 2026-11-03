import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Si el valor no es texto, se deja tal cual para que lo rechace la validación.
const normalizeEmail = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

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
